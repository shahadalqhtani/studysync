# Firestore Structure

## users (collection)
- {uid}
  - name
  - email
  - createdAt

## courses (collection)
- {courseId}
  - title
  - members: [uid1, uid2, ...]
  - createdAt

### tasks (subcollection under courses)
- {taskId}
  - title
  - description
  - status ("todo" | "in-progress" | "done")
  - assignedTo: uid
  - createdAt
