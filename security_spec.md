# Security Specification - EduConnect

## Data Invariants
1. **User Profiles**: Users can only update their own profiles. Sensitive fields like `role` are immutable by the user.
2. **Announcements**: Only staff can create/delete. Everyone signed in can read (list/get) but rules must enforce targeting if necessary (though school-wide is allowed).
3. **Attendance**: Only staff can write. Students can only read their own records.
4. **Fees**: Only staff can write. Students can only read their own records.
5. **Homework**: Staff manage assignments. Students submit. submissions are private to student and staff.
6. **Library**: Only staff can add/edit resources. All signed in users can read.

## The Dirty Dozen Payloads

1. **Identity Spoofing (Users)**: Attempt to update `role` to 'staff' as a student.
2. **PII Leak (Users)**: Attempt to read another user's profile without being staff.
3. **Ghost Field (Users)**: Attempt to update `isVerified: true` (a field not in schema).
4. **Announcement Hijack**: Attempt to create an announcement as a student.
5. **Announcement Deception**: Attempt to update an announcement's `authorId` to another user.
6. **Attendance Forgery**: Attempt to mark oneself as 'present' as a student.
7. **Fee Erasure**: Attempt to update fee status to 'paid' as a student.
8. **Homework Submission Overwrite**: Attempt to delete another student's submission.
9. **Library Poisoning**: Attempt to add a 10MB string as a book title.
10. **Chat Eavesdropping**: Attempt to read messages in a chat one is not part of.
11. **Timetable Alteration**: Attempt to update a class timetable as a student.
12. **Notification Spam**: Attempt to update another user's `notifications` settings.

## Test Runner (Logic)
- `users/{userId}` update: fails if `role` changes.
- `announcements` create: fails if `request.auth.uid` doesn't have `role == 'staff'`.
- `announcements` list: requires `target == 'all'` or `targetClass == user.classId` for students.
