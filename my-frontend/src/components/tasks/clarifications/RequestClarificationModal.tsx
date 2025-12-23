/**
 * Request Clarification Modal
 * 
 * Modal for requesting clarification on a task from another user or department.
 * Uses purple theme for visual distinction from approval/escalation flows.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  HelpCircle,
  User,
  Building2,
  Clock,
  AlertCircle,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { useRequestClarification } from '@/hooks/useClarifications';
import { ClarificationUrgency } from '@/types/task';

interface RequestClarificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle: string;
  onSuccess?: () => void;
  // Optional pre-populated responder
  defaultResponderId?: number;
  defaultResponderName?: string;
  // Available users/departments for selection
  availableUsers?: Array<{
    id: number;
    name: string;
    email: string;
    department?: string;
  }>;
  availableDepartments?: Array<{
    id: string;
    name: string;
  }>;
}

const urgencyOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

const expiryOptions = [
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours (default)' },
  { value: 72, label: '72 hours' },
  { value: 96, label: '4 days' },
  { value: 168, label: '1 week' },
];

export function RequestClarificationModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onSuccess,
  defaultResponderId,
  defaultResponderName,
  availableUsers = [],
  availableDepartments = [],
}: RequestClarificationModalProps) {
  // Form state
  const [responderType, setResponderType] = useState<'user' | 'department'>('user');
  const [selectedUserId, setSelectedUserId] = useState<string>(
    defaultResponderId?.toString() || ''
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [urgency, setUrgency] = useState<ClarificationUrgency>(ClarificationUrgency.NORMAL);
  const [expiryHours, setExpiryHours] = useState(48);
  const [pauseSla, setPauseSla] = useState(true);
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>>([]);
  
  const requestClarification = useRequestClarification();
  
  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuestion('');
      setUrgency(ClarificationUrgency.NORMAL);
      setExpiryHours(48);
      setPauseSla(true);
      setAttachments([]);
      if (!defaultResponderId) {
        setSelectedUserId('');
        setSelectedDepartmentId('');
      }
    }
  }, [isOpen, defaultResponderId]);
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!question.trim()) return;
    
    const params: Parameters<typeof requestClarification.mutate>[0] = {
      taskId,
      question: question.trim(),
      urgency,
      expiryHours,
      pauseSla,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    
    if (responderType === 'user' && selectedUserId) {
      params.responderId = parseInt(selectedUserId);
    } else if (responderType === 'department' && selectedDepartmentId) {
      params.responderDepartmentId = selectedDepartmentId;
    }
    
    requestClarification.mutate(params, {
      onSuccess: () => {
        onClose();
        onSuccess?.();
      },
    });
  };
  
  const isValid = question.trim().length > 0 && 
    ((responderType === 'user' && selectedUserId) || 
     (responderType === 'department' && selectedDepartmentId));
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <HelpCircle className="w-5 h-5" />
            Request Clarification
          </DialogTitle>
          <DialogDescription>
            Ask for clarification from another user or department.
            This will NOT change task ownership or approval chain.
          </DialogDescription>
        </DialogHeader>
        
        {/* Task info */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
          <div className="text-sm text-purple-700 dark:text-purple-300">
            <strong>Task:</strong> {taskTitle}
          </div>
        </div>
        
        {/* Form */}
        <div className="space-y-4 py-2">
          {/* Responder Type Selection */}
          <div className="flex gap-2">
            <Button
              variant={responderType === 'user' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setResponderType('user')}
              className={responderType === 'user' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <User className="w-4 h-4 mr-1" />
              Specific User
            </Button>
            <Button
              variant={responderType === 'department' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setResponderType('department')}
              className={responderType === 'department' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <Building2 className="w-4 h-4 mr-1" />
              Department
            </Button>
          </div>
          
          {/* Responder Selection */}
          {responderType === 'user' ? (
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user to ask..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{user.name}</span>
                        {user.department && (
                          <Badge variant="outline" className="text-xs">
                            {user.department}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Department</Label>
              <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a department..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{dept.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question">Your Question</Label>
            <Textarea
              id="question"
              placeholder="What do you need clarification on?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          
          {/* Urgency & Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select 
                value={urgency} 
                onValueChange={(v) => setUrgency(v as ClarificationUrgency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urgencyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <Badge variant="outline" className={opt.color}>
                        {opt.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Response Deadline
              </Label>
              <Select 
                value={expiryHours.toString()} 
                onValueChange={(v) => setExpiryHours(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expiryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* SLA Pause Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="pause-sla" className="cursor-pointer">
                Pause Task SLA
              </Label>
              <p className="text-xs text-gray-500">
                SLA timer will pause while waiting for clarification
              </p>
            </div>
            <Switch
              id="pause-sla"
              checked={pauseSla}
              onCheckedChange={setPauseSla}
            />
          </div>
          
          {/* Info Alert */}
          <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
            <AlertCircle className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-sm text-purple-700 dark:text-purple-300">
              The responder will only have <strong>read-only access</strong> to this task. 
              They cannot approve, reject, or modify the task.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || requestClarification.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {requestClarification.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <HelpCircle className="w-4 h-4 mr-2" />
                Request Clarification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RequestClarificationModal;
