# Product Screen and Accessibility Matrix

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Comprehensive User Interface Specification across Seven Roles

<table>
<tr><th>Role</th><th>Route</th><th>Access Rule</th><th>Data Source</th><th>States Supported</th><th>Accessibility / Semantics</th></tr>
<tr><td>Public Observer</td><td>/</td><td>Public</td><td>Static / Config</td><td>Ready, Error</td><td>WCAG AA compliant, high contrast color palette</td></tr>
<tr><td>Public Observer</td><td>/how it works</td><td>Public</td><td>Protocol guide</td><td>Ready</td><td>Step by step protocol diagrams with text fallbacks</td></tr>
<tr><td>Public Observer</td><td>/elections</td><td>Public</td><td>API /elections</td><td>Loading, Empty, Ready, Error</td><td>Semantic table with sortable column headers</td></tr>
<tr><td>Public Observer</td><td>/results/[id]</td><td>Public</td><td>API /results</td><td>Loading, Certified, Privacy Limited</td><td>Turnout progress bars with aria valuenow attributes</td></tr>
<tr><td>Student</td><td>/auth/login</td><td>Unauthenticated</td><td>Identity Auth API</td><td>Form, Loading, Error, MFA Challenge</td><td>Accessible form labels, focus retention on error</td></tr>
<tr><td>Student</td><td>/student/elections</td><td>Student Role</td><td>API /student/elections</td><td>Loading, Empty, Active Contests</td><td>Status badges with aria live announcements</td></tr>
<tr><td>Student</td><td>/student/elections/[id]/cast</td><td>Eligible Student</td><td>Casting Gateway</td><td>Booth Handoff, Submitting, Confirmed</td><td>Keyboard focus trapped modal during booth session</td></tr>
<tr><td>Student</td><td>/student/receipts/[handle]</td><td>Eligible Student</td><td>API /receipts</td><td>Committed, Witnessed, Anchored</td><td>Three step vertical progress stepper with text alternatives</td></tr>
<tr><td>Teacher</td><td>/teacher/classes</td><td>Teacher Role</td><td>API /teacher/classes</td><td>Class Roster, Empty, Error</td><td>Class list with accessible verification action buttons</td></tr>
<tr><td>Teacher</td><td>/teacher/verification queue</td><td>Teacher Role</td><td>API /teacher/queue</td><td>Pending Verification, Verified</td><td>Confirmation dialog with screen reader trap</td></tr>
<tr><td>Election Officer</td><td>/officer/elections/new</td><td>Election Officer</td><td>API /officer/elections</td><td>Wizard Steps 1 through 5</td><td>Keyboard navigable form stepper with error summaries</td></tr>
<tr><td>Election Officer</td><td>/officer/elections/[id]/freeze</td><td>Election Officer</td><td>API /officer/freeze</td><td>Review, Digest Confirmation, Frozen</td><td>Warning callouts before irreversible manifest freeze</td></tr>
<tr><td>Election Officer</td><td>/officer/elections/[id]/publication</td><td>Election Officer</td><td>API /officer/publish</td><td>Audit Verification Check, Published</td><td>Requires independently verified attestation upload</td></tr>
<tr><td>Administrator</td><td>/admin/students</td><td>Administrator</td><td>API /admin/students</td><td>Search, Filter, Pagination</td><td>Data table with keyboard row selection</td></tr>
<tr><td>Administrator</td><td>/admin/roster imports</td><td>Administrator</td><td>API /admin/imports</td><td>CSV Upload, Preview, Committed</td><td>Drag and drop zone with explicit keyboard file picker</td></tr>
<tr><td>Super Administrator</td><td>/super admin/institutions</td><td>Super Admin</td><td>API /superadmin/tenants</td><td>Tenant Listing, Add Campus</td><td>Strict multi factor authorization required</td></tr>
<tr><td>Super Administrator</td><td>/super admin/role requests</td><td>Super Admin</td><td>API /superadmin/requests</td><td>Pending Approvals, Decided</td><td>Dual control approval workflow enforcing non self approval</td></tr>
<tr><td>Independent Auditor</td><td>/auditor/evidence</td><td>Auditor Role</td><td>Offline Archive / API</td><td>Drag and Drop Zip, Ingestion, Error</td><td>Zip slip protection notice and hash calculation</td></tr>
<tr><td>Independent Auditor</td><td>/auditor/verify</td><td>Auditor Role</td><td>Standalone Verifier</td><td>Execution Progress, Results Grid</td><td>Eleven property verification cards with status icons</td></tr>
</table>
