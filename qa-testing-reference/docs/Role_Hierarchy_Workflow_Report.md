# Role Hierarchy & Workflow Access Report

## 1. System Overview
The ERP platform is designed to streamline business processes through integrated modules that facilitate communication, client management, and approval workflows. Key features include:
- **Chat Window**: Enables real-time communication among users.
- **Call Function (Jitsi)**: Provides video conferencing capabilities.
- **Client Creation**: Allows users to create and manage client profiles.
- **Approval Workflow**: Implements multi-level approval processes for various actions.

### Modules Overview
- **Chat Module**: Facilitates messaging and notifications.
- **Client Management Module**: Handles client data and interactions.
- **Approval Workflow Module**: Manages approval processes for client-related actions.
- **User Management Module**: Controls user roles and permissions.

## 2. Role Hierarchy
### Roles Defined
| Role                | Description                                         | What They Can See                          | What Actions They Can Perform                          | Restrictions                          |
|---------------------|-----------------------------------------------------|--------------------------------------------|-------------------------------------------------------|---------------------------------------|
| **Super Admin**     | Full control over the system                        | All data and settings                      | Manage all users, modules, and settings               | None                                  |
| **Org Admin**       | Manages organization-level settings                 | Organization data, user roles              | Create/edit users, manage modules                      | Cannot delete Super Admin            |
| **Department Manager** | Oversees department operations                    | Department data, team members              | Approve client requests, manage team members          | Limited to their department           |
| **Team Lead**       | Leads a specific team                               | Team data, client interactions             | Initiate client creation, approve requests             | Cannot manage users outside their team|
| **Agent/User**      | Frontline users handling client interactions        | Client data relevant to their role        | Create clients, view chats, initiate calls             | Cannot approve requests               |
| **Auditor/Read-only** | Reviews data without making changes               | Audit logs, reports                        | View audit logs and reports                            | Cannot perform any actions            |
| **External Client**  | Limited access for clients                          | Limited client data                        | View their own data, initiate chats                    | Cannot access internal data           |

## 3. Access Matrix (Who Can Do What)
| Action                     | Super Admin | Org Admin | Department Manager | Team Lead | Agent/User | Auditor/Read-only | External Client |
|---------------------------|-------------|-----------|--------------------|-----------|------------|-------------------|------------------|
| Create client             | Yes         | Yes       | Yes                | Yes       | Yes        | No                | No               |
| Edit client               | Yes         | Yes       | Yes                | Yes       | Yes        | No                | No               |
| Approve client            | Yes         | Yes       | Yes                | No        | No         | No                | No               |
| View chats                | Yes         | Yes       | Yes                | Yes       | Yes        | No                | Limited          |
| Initiate chat             | Yes         | Yes       | Yes                | Yes       | Yes        | No                | Yes              |
| Start group call          | Yes         | Yes       | Yes                | Yes       | Yes        | No                | Yes              |
| Join call                 | Yes         | Yes       | Yes                | Yes       | Yes        | No                | Yes              |
| End call                  | Yes         | Yes       | Yes                | Yes       | Yes        | No                | No               |
| Manage modules            | Yes         | Yes       | No                 | No        | No         | No                | No               |
| Manage users              | Yes         | Yes       | No                 | No        | No         | No                | No               |
| View audit logs           | Yes         | Yes       | Yes                | Yes       | No         | Yes               | No               |
| View reports              | Yes         | Yes       | Yes                | Yes       | No         | Yes               | No               |
| Access dashboard          | Yes         | Yes       | Yes                | Yes       | Yes        | No                | No               |
| See financial data        | Yes         | Yes       | Yes                | No        | No         | No                | No               |
| See internal notes        | Yes         | Yes       | Yes                | No        | No         | No                | No               |
| External user visibility   | No          | No        | No                 | No        | No         | No                | Yes              |

## 4. Approval Workflow Hierarchy
### Client Creation Workflow
- **Initiator**: Submits basic client information.
- **Reviewer**: Department Manager validates the submission.
- **Approver**: Finance verifies compliance with policies.
- **Final Approver**: Org Admin activates the client account.

### Workflow Details
- **Triggers**: Each stage triggers the next upon successful completion.
- **Rejection Rules**: If any stage rejects the submission, the initiator is notified with reasons.
- **SLA Expectations**: Each approval stage should be completed within 48 hours.

## 5. Chat & Call Workflow
- **Who Can Start a Call**: Any user with permission can initiate a call.
- **Who Can Join a Call**: Only members of the thread can join; external clients can join if invited.
- **Non-Member Joining**: Non-members attempting to join will receive an error message.
- **Thread Membership Rules**: Users must be added to a thread to access its content.
- **UI Elements to Verify**: Call buttons, chat windows, and notification settings.
- **Permissions**: Users can start and end calls; only designated roles can manage call settings.
- **Presence Logic**: Users can be online, offline, or idle based on activity.
- **Notification Rules**: Users receive notifications for messages and calls based on their settings.

## 6. Visibility Rules (Who Can See What)
- **Thread Visibility**: Only members can view thread content.
- **Client Data Visibility**: Varies by role; sensitive data is restricted.
- **Restricted Fields**: Financial and compliance-related fields are visible only to specific roles.
- **Public vs Internal Codes**: Public codes are accessible to external clients; internal codes are restricted.
- **Audit Trails Visibility**: Auditors can view all audit trails; other roles have limited access.
- **Action Logs Visibility**: Only Super Admins and Org Admins can view detailed action logs.

## 7. Workflow Diagrams (Text-based)
### Client Creation Flow
```
Initiator → Reviewer → Approver → Final Approver
```

### Call Workflow Flow
```
User Initiates Call → Members Join Call → Call Ends
```

### Chat Thread Membership Flow
```
User Added to Thread → User Can View/Participate in Thread
```

### Approval Hierarchy Flow
```
Initiator → Reviewer → Approver → Final Approver
```

## 8. TBD Sections
- **Features Not Fully Developed**: 
  - Multi-level approval for all actions.
  - Complete integration of external references.
- **Partially Working**: 
  - Chat functionality is in beta.
- **Planned Features**: 
  - Enhanced reporting capabilities.
- **Ignore for Now**: 
  - Any UI elements related to unimplemented features.
- **UI-Level Validation Only**: 
  - Chat UI elements.

## 9. Test Scenarios & Expected Results
### Sample Test Cases
- **Access-Based Tests**: Verify that only authorized roles can create clients.
- **Visibility Tests**: Ensure that users can only see data they are permitted to view.
- **Permission-Denied Scenarios**: Attempt actions as unauthorized roles and confirm access is denied.
- **Workflow Transitions**: Test the approval process for client creation.
- **Call/Chat Actions**: Validate that users can initiate and join calls as expected.
- **UI/UX Validations**: Check the layout and functionality of chat and call interfaces.

## 10. Known Limitations
- **Unfinished Areas**: 
  - Approval workflows for all modules are not fully implemented.
- **Known Bugs**: 
  - Chat notifications may not trigger correctly.
- **Back-End Integrations**: 
  - External API connections are pending.
- **UI Not Final**: 
  - Some UI elements are subject to change based on feedback.

## 11. Glossary
- **Client Identification Code**: Unique identifier for each client.
- **Public Code**: Code accessible to external clients.
- **Type Sequence Code**: Code used to categorize client types.
- **External Reference**: Links to external systems or data.
- **Thread**: A conversation or discussion group within the chat module.
- **Initiator**: The user who starts a workflow or process.
- **Approver**: The user responsible for validating and approving requests.
- **RBAC**: Role-Based Access Control, a method for restricting system access.
- **Presence**: The status of a user indicating their availability (online/offline/idle).