/**
 * Contract Management API Routes
 * Admin Panel - Agreement & Contract Management Module
 * 
 * Endpoints:
 * GET    /api/admin/contracts           - List all contracts with filters
 * GET    /api/admin/contracts/stats     - Get contract statistics/KPIs
 * GET    /api/admin/contracts/:id       - Get contract details
 * POST   /api/admin/contracts           - Create new contract
 * PUT    /api/admin/contracts/:id       - Update contract
 * PATCH  /api/admin/contracts/:id/status - Update contract status
 * DELETE /api/admin/contracts/:id       - Delete contract (soft)
 * GET    /api/admin/contracts/:id/audit - Get audit logs
 * POST   /api/admin/contracts/:id/documents - Upload document
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { getPrisma } = require('../../lib/prisma');

// Helper to convert UUID user ID to legacy integer ID for database fields
async function resolveUserIdToInt(userId, prisma) {
  const isUUID = typeof userId === 'string' && 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  
  if (!isUUID) return userId; // Already an integer
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { legacy_id: true }
    });
    if (user?.legacy_id) {
      return user.legacy_id;
    }
  } catch (e) {
    console.warn('[contracts] Failed to lookup user legacy_id:', e.message);
  }
  
  // Fallback: use a hash of the UUID to generate an integer
  return Math.abs(userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0));
}

// Helper to generate contract number
function generateContractNumber(type) {
  const prefix = {
    'RENT': 'RNT',
    'VEHICLE': 'VEH',
    'VENDOR': 'VND',
    'CUSTOM': 'CNT'
  }[type] || 'CNT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

// Helper to calculate days until expiry
function daysUntilExpiry(endDate) {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * GET /api/admin/contracts
 * List all contracts with filtering, sorting, and pagination
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const {
      page = 1,
      limit = 20,
      status,
      contract_type,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
      expiring_in_days,
      start_date_from,
      start_date_to
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    if (status) {
      where.status = status;
    }

    if (contract_type) {
      where.contract_type = contract_type;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { party_name: { contains: search, mode: 'insensitive' } },
        { contract_number: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (expiring_in_days) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(expiring_in_days));
      where.end_date = {
        lte: futureDate,
        gte: new Date()
      };
      where.status = 'ACTIVE';
    }

    if (start_date_from || start_date_to) {
      where.start_date = {};
      if (start_date_from) where.start_date.gte = new Date(start_date_from);
      if (start_date_to) where.start_date.lte = new Date(start_date_to);
    }

    // Build orderBy
    const orderBy = {};
    orderBy[sort_by] = sort_order;

    // Fetch contracts with relations
    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          financials: true,
          _count: {
            select: { documents: true }
          }
        }
      }),
      prisma.contract.count({ where })
    ]);

    // Add computed fields
    const enrichedContracts = contracts.map(contract => ({
      ...contract,
      days_until_expiry: daysUntilExpiry(contract.end_date),
      monthly_value: contract.financials?.monthly_amount || 0,
      document_count: contract._count.documents
    }));

    res.json({
      success: true,
      data: {
        contracts: enrichedContracts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('[Contracts] List error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contracts',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/contracts/stats
 * Get contract statistics for KPI cards
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      totalActive,
      expiringIn30Days,
      totalExpired,
      financialAggregates
    ] = await Promise.all([
      // Total active contracts
      prisma.contract.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Expiring in 30 days
      prisma.contract.count({
        where: {
          status: 'ACTIVE',
          end_date: {
            lte: thirtyDaysFromNow,
            gte: now
          }
        }
      }),
      
      // Total expired
      prisma.contract.count({
        where: { status: 'EXPIRED' }
      }),
      
      // Financial aggregates
      prisma.contractFinancial.aggregate({
        where: {
          contract: { status: 'ACTIVE' }
        },
        _sum: {
          monthly_amount: true,
          advance_amount: true,
          security_deposit: true
        }
      })
    ]);

    // Count by type
    const byType = await prisma.contract.groupBy({
      by: ['contract_type'],
      where: { status: 'ACTIVE' },
      _count: { id: true }
    });

    const typeStats = byType.reduce((acc, item) => {
      acc[item.contract_type] = item._count.id;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total_active: totalActive,
        expiring_in_30_days: expiringIn30Days,
        total_expired: totalExpired,
        monthly_commitment: parseFloat(financialAggregates._sum.monthly_amount || 0),
        advance_locked: parseFloat(financialAggregates._sum.advance_amount || 0),
        security_deposits: parseFloat(financialAggregates._sum.security_deposit || 0),
        by_type: typeStats
      }
    });

  } catch (error) {
    console.error('[Contracts] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contract stats',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/contracts/:id
 * Get single contract with all details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        financials: true,
        rent_details: true,
        vehicle_details: true,
        vendor_details: true,
        documents: {
          orderBy: { uploaded_at: 'desc' }
        },
        audit_logs: {
          orderBy: { performed_at: 'desc' },
          take: 20
        },
        reminders: true
      }
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    // Add computed fields
    const enrichedContract = {
      ...contract,
      days_until_expiry: daysUntilExpiry(contract.end_date)
    };

    res.json({
      success: true,
      data: enrichedContract
    });

  } catch (error) {
    console.error('[Contracts] Get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contract',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/contracts
 * Create new contract
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const createdByUserId = await resolveUserIdToInt(req.user.id, prisma);
    
    const {
      // Basic info
      contract_type,
      title,
      description,
      
      // Party info
      party_name,
      party_type,
      contact_person,
      contact_phone,
      contact_email,
      party_address,
      party_gst,
      party_pan,
      
      // Dates
      start_date,
      end_date,
      signed_date,
      
      // Renewal
      auto_renew,
      renewal_period_months,
      notice_period_days,
      
      // Status
      status = 'DRAFT',
      
      // Tags & Notes
      tags,
      internal_notes,
      
      // Financials
      financials,
      
      // Type-specific details
      rent_details,
      vehicle_details,
      vendor_details
    } = req.body;

    // Validate required fields
    if (!contract_type || !title || !party_name || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contract_type, title, party_name, start_date, end_date'
      });
    }

    // Generate contract number
    const contract_number = generateContractNumber(contract_type);

    // Create contract with related data in a transaction
    const contract = await prisma.$transaction(async (tx) => {
      // Create main contract
      const newContract = await tx.contract.create({
        data: {
          contract_number,
          contract_type,
          title,
          description,
          party_name,
          party_type: party_type || 'COMPANY',
          contact_person,
          contact_phone,
          contact_email,
          party_address,
          party_gst,
          party_pan,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          signed_date: signed_date ? new Date(signed_date) : null,
          auto_renew: auto_renew || false,
          renewal_period_months,
          notice_period_days: notice_period_days || 30,
          status,
          tags: tags || [],
          internal_notes,
          created_by: createdByUserId
        }
      });

      // Create financials if provided
      if (financials) {
        await tx.contractFinancial.create({
          data: {
            contract_id: newContract.id,
            monthly_amount: financials.monthly_amount || 0,
            advance_amount: financials.advance_amount || 0,
            security_deposit: financials.security_deposit || 0,
            tax_type: financials.tax_type,
            tax_percentage: financials.tax_percentage || 0,
            payment_cycle: financials.payment_cycle || 'MONTHLY',
            payment_due_day: financials.payment_due_day || 1,
            escalation_percentage: financials.escalation_percentage || 0,
            escalation_frequency: financials.escalation_frequency,
            total_contract_value: financials.total_contract_value || 0,
            bank_name: financials.bank_name,
            bank_account_number: financials.bank_account_number,
            bank_ifsc: financials.bank_ifsc
          }
        });
      }

      // Create type-specific details
      if (contract_type === 'RENT' && rent_details) {
        await tx.rentContractDetail.create({
          data: {
            contract_id: newContract.id,
            property_type: rent_details.property_type,
            property_address: rent_details.property_address || party_address || '',
            property_area_sqft: rent_details.property_area_sqft,
            maintenance_charges: rent_details.maintenance_charges || 0,
            electricity_included: rent_details.electricity_included || false,
            water_included: rent_details.water_included || false,
            registration_number: rent_details.registration_number,
            stamp_duty_paid: rent_details.stamp_duty_paid || 0
          }
        });
      }

      if (contract_type === 'VEHICLE' && vehicle_details) {
        await tx.vehicleContractDetail.create({
          data: {
            contract_id: newContract.id,
            vehicle_type: vehicle_details.vehicle_type,
            vehicle_number: vehicle_details.vehicle_number,
            vehicle_model: vehicle_details.vehicle_model,
            vehicle_make: vehicle_details.vehicle_make,
            fuel_type: vehicle_details.fuel_type,
            per_km_rate: vehicle_details.per_km_rate || 0,
            included_km_monthly: vehicle_details.included_km_monthly || 0,
            excess_km_rate: vehicle_details.excess_km_rate || 0,
            driver_included: vehicle_details.driver_included || false,
            driver_name: vehicle_details.driver_name,
            driver_phone: vehicle_details.driver_phone,
            insurance_expiry: vehicle_details.insurance_expiry ? new Date(vehicle_details.insurance_expiry) : null,
            fitness_expiry: vehicle_details.fitness_expiry ? new Date(vehicle_details.fitness_expiry) : null,
            permit_expiry: vehicle_details.permit_expiry ? new Date(vehicle_details.permit_expiry) : null
          }
        });
      }

      if (contract_type === 'VENDOR' && vendor_details) {
        await tx.vendorContractDetail.create({
          data: {
            contract_id: newContract.id,
            service_category: vendor_details.service_category,
            service_description: vendor_details.service_description,
            payment_model: vendor_details.payment_model || 'FIXED_MONTHLY',
            sla_level: vendor_details.sla_level,
            sla_response_hours: vendor_details.sla_response_hours,
            sla_resolution_hours: vendor_details.sla_resolution_hours,
            penalty_clause: vendor_details.penalty_clause,
            penalty_percentage: vendor_details.penalty_percentage || 0,
            kpi_metrics: vendor_details.kpi_metrics
          }
        });
      }

      // Create audit log
      await tx.contractAuditLog.create({
        data: {
          contract_id: newContract.id,
          action: 'CREATED',
          action_details: `Contract created with status: ${status}`,
          new_values: { contract_type, title, party_name, status },
          performed_by: createdByUserId,
          performed_by_name: req.user.name || req.user.email
        }
      });

      // Create default reminders for expiry
      const reminderDays = [30, 15, 7];
      await tx.contractReminder.createMany({
        data: reminderDays.map(days => ({
          contract_id: newContract.id,
          reminder_type: 'EXPIRY',
          reminder_days_before: days,
          recipient_emails: [contact_email].filter(Boolean)
        }))
      });

      return newContract;
    });

    // Fetch complete contract with relations
    const fullContract = await prisma.contract.findUnique({
      where: { id: contract.id },
      include: {
        financials: true,
        rent_details: true,
        vehicle_details: true,
        vendor_details: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Contract created successfully',
      data: fullContract
    });

  } catch (error) {
    console.error('[Contracts] Create error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contract',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/contracts/:id
 * Update contract
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const userId = await resolveUserIdToInt(req.user.id, prisma);
    const updateData = req.body;

    // Fetch existing contract
    const existing = await prisma.contract.findUnique({
      where: { id },
      include: {
        financials: true,
        rent_details: true,
        vehicle_details: true,
        vendor_details: true
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    // Prevent editing terminated contracts
    if (existing.status === 'TERMINATED') {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit a terminated contract'
      });
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // Update main contract
      const { financials, rent_details, vehicle_details, vendor_details, ...contractData } = updateData;
      
      const updatedContract = await tx.contract.update({
        where: { id },
        data: {
          ...contractData,
          start_date: contractData.start_date ? new Date(contractData.start_date) : undefined,
          end_date: contractData.end_date ? new Date(contractData.end_date) : undefined,
          signed_date: contractData.signed_date ? new Date(contractData.signed_date) : undefined,
          updated_by: userId,
          updated_at: new Date()
        }
      });

      // Update financials
      if (financials) {
        await tx.contractFinancial.upsert({
          where: { contract_id: id },
          create: {
            contract_id: id,
            ...financials
          },
          update: financials
        });
      }

      // Update type-specific details
      if (rent_details && existing.contract_type === 'RENT') {
        await tx.rentContractDetail.upsert({
          where: { contract_id: id },
          create: { contract_id: id, ...rent_details },
          update: rent_details
        });
      }

      if (vehicle_details && existing.contract_type === 'VEHICLE') {
        await tx.vehicleContractDetail.upsert({
          where: { contract_id: id },
          create: { contract_id: id, ...vehicle_details },
          update: vehicle_details
        });
      }

      if (vendor_details && existing.contract_type === 'VENDOR') {
        await tx.vendorContractDetail.upsert({
          where: { contract_id: id },
          create: { contract_id: id, ...vendor_details },
          update: vendor_details
        });
      }

      // Create audit log
      await tx.contractAuditLog.create({
        data: {
          contract_id: id,
          action: 'UPDATED',
          action_details: 'Contract details updated',
          old_values: { title: existing.title, status: existing.status },
          new_values: { title: contractData.title || existing.title, status: contractData.status || existing.status },
          performed_by: userId,
          performed_by_name: req.user.name || req.user.email
        }
      });

      return updatedContract;
    });

    // Fetch updated contract
    const fullContract = await prisma.contract.findUnique({
      where: { id },
      include: {
        financials: true,
        rent_details: true,
        vehicle_details: true,
        vendor_details: true
      }
    });

    res.json({
      success: true,
      message: 'Contract updated successfully',
      data: fullContract
    });

  } catch (error) {
    console.error('[Contracts] Update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contract',
      message: error.message
    });
  }
});

/**
 * PATCH /api/admin/contracts/:id/status
 * Update contract status (activate, terminate, suspend)
 */
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const userId = await resolveUserIdToInt(req.user.id, prisma);
    const { status, termination_reason } = req.body;

    const validStatuses = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    const updateData = {
      status,
      updated_by: userId,
      updated_at: new Date()
    };

    if (status === 'TERMINATED') {
      updateData.termination_reason = termination_reason;
      updateData.terminated_at = new Date();
      updateData.terminated_by = userId;
    }

    const [contract] = await prisma.$transaction([
      prisma.contract.update({
        where: { id },
        data: updateData
      }),
      prisma.contractAuditLog.create({
        data: {
          contract_id: id,
          action: 'STATUS_CHANGED',
          action_details: `Status changed from ${existing.status} to ${status}${termination_reason ? `. Reason: ${termination_reason}` : ''}`,
          old_values: { status: existing.status },
          new_values: { status, termination_reason },
          performed_by: userId,
          performed_by_name: req.user.name || req.user.email
        }
      })
    ]);

    res.json({
      success: true,
      message: `Contract ${status.toLowerCase()} successfully`,
      data: contract
    });

  } catch (error) {
    console.error('[Contracts] Status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contract status',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/contracts/:id
 * Delete contract (only if DRAFT)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    if (contract.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Only draft contracts can be deleted. Terminate active contracts instead.'
      });
    }

    await prisma.contract.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Contract deleted successfully'
    });

  } catch (error) {
    console.error('[Contracts] Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contract',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/contracts/:id/audit
 * Get audit logs for a contract
 */
router.get('/:id/audit', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const logs = await prisma.contractAuditLog.findMany({
      where: { contract_id: id },
      orderBy: { performed_at: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: logs
    });

  } catch (error) {
    console.error('[Contracts] Audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/contracts/:id/documents
 * Add document to contract (metadata only - actual upload handled separately)
 */
router.post('/:id/documents', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const userId = await resolveUserIdToInt(req.user.id, prisma);
    const {
      file_name,
      file_url,
      file_type,
      file_size_bytes,
      document_type,
      description
    } = req.body;

    if (!file_name || !file_url) {
      return res.status(400).json({
        success: false,
        error: 'file_name and file_url are required'
      });
    }

    const [document] = await prisma.$transaction([
      prisma.contractDocument.create({
        data: {
          contract_id: id,
          file_name,
          file_url,
          file_type: file_type || 'OTHER',
          file_size_bytes,
          document_type: document_type || 'OTHER',
          description,
          uploaded_by: userId
        }
      }),
      prisma.contractAuditLog.create({
        data: {
          contract_id: id,
          action: 'DOCUMENT_ADDED',
          action_details: `Document "${file_name}" uploaded`,
          new_values: { file_name, document_type },
          performed_by: userId,
          performed_by_name: req.user.name || req.user.email
        }
      })
    ]);

    res.status(201).json({
      success: true,
      message: 'Document added successfully',
      data: document
    });

  } catch (error) {
    console.error('[Contracts] Document add error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add document',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/contracts/:id/renew
 * Renew a contract
 */
router.post('/:id/renew', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const userId = await resolveUserIdToInt(req.user.id, prisma);
    const { new_end_date, new_monthly_amount } = req.body;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { financials: true }
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    if (contract.status !== 'ACTIVE' && contract.status !== 'EXPIRED') {
      return res.status(400).json({
        success: false,
        error: 'Only active or expired contracts can be renewed'
      });
    }

    let endDate = new_end_date ? new Date(new_end_date) : null;
    if (!endDate && contract.renewal_period_months) {
      const currentEnd = new Date(contract.end_date);
      endDate = new Date(currentEnd);
      endDate.setMonth(endDate.getMonth() + contract.renewal_period_months);
    }

    if (!endDate) {
      return res.status(400).json({
        success: false,
        error: 'new_end_date is required or set renewal_period_months on contract'
      });
    }

    const [updatedContract] = await prisma.$transaction([
      prisma.contract.update({
        where: { id },
        data: {
          end_date: endDate,
          status: 'ACTIVE',
          updated_by: userId
        }
      }),
      ...(new_monthly_amount && contract.financials ? [
        prisma.contractFinancial.update({
          where: { contract_id: id },
          data: { monthly_amount: new_monthly_amount }
        })
      ] : []),
      prisma.contractAuditLog.create({
        data: {
          contract_id: id,
          action: 'RENEWED',
          action_details: `Contract renewed until ${endDate.toISOString().split('T')[0]}`,
          old_values: { end_date: contract.end_date },
          new_values: { end_date: endDate, new_monthly_amount },
          performed_by: userId,
          performed_by_name: req.user.name || req.user.email
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Contract renewed successfully',
      data: updatedContract
    });

  } catch (error) {
    console.error('[Contracts] Renew error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to renew contract',
      message: error.message
    });
  }
});

module.exports = router;
