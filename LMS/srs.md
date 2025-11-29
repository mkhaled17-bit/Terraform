

# Software Requirements Specification (SRS)

## Library Management System (LMS)

### 1. Introduction

**Purpose:**
The Library Management System (LMS) automates book, member, and borrowing/return operations, reducing manual effort and providing quick access to library information.

**Scope:**

* Book & member management
* Borrowing & returning books
* Search functionality
* Basic report generation
* Support for Admin and Regular Users

**Intended Users:**

* Admin (Librarian): Full access
* Regular User (Member): Limited access

---

### 2. Features

| Feature ID | Feature Name          | Description                         | Story Points |
| ---------- | --------------------- | ----------------------------------- |--------------|
| F1         | Book Management       | Add, edit, delete, view books       |      13      |
| F2         | Member Management     | Add, edit, delete, view members     |      13      | 
| F3         | Borrowing & Returning | Record borrow/return transactions   |      8       |
| F4         | Search Books          | Search books by title, author, ISBN |      3       |
| F5         | Reports               | Generate borrowed/overdue reports   |      3       |
| F6         | Auth                  | Secure login                        |      3       |

---

### 3. Functional Requirements

| ID   | Requirement                                            | Role        | Priority     |
| ---- | ------------------------------------------------------ | ----------- | ------------ |
| FR1  | Add new book (title, author, ISBN, category, quantity) | Admin       | Mandatory    |
| FR2  | Edit book details                                      | Admin       | Mandatory    |
| FR3  | Delete books                                           | Admin       | Mandatory    |
| FR4  | View list of all books                                 | Admin, User | Mandatory    |
| FR5  | Add new members                                        | Admin       | Mandatory    |
| FR6  | Edit member info                                       | Admin       | Nice-to-Have |
| FR7  | Delete members                                         | Admin       | Nice-to-Have |
| FR8  | View list of members                                   | Admin       | Mandatory    |
| FR9  | Record book borrowing with due date                    | Admin       | Mandatory    |
| FR10 | Record book return                                     | Admin       | Mandatory    |
| FR11 | Search books by title, author, ISBN                    | Admin, User | Nice-to-Have |
| FR12 | View own borrowing history                             | User        | Nice-to-Have |
| FR13 | Generate reports (borrowed/overdue)                    | Admin       | Nice-to-Have |

---

### 4. Non-Functional Requirements

| ID   | Requirement                          | Notes      | Priority     |
| ---- | ------------------------------------ | ---------- | ------------ |
| NFR1 | Simple, user-friendly interface      | Both roles | Nice-to-have |
| NFR2 | Fast search & list (<2s)             | Both roles | Nice-to-have |
| NFR3 | Authorization for admin tasks        | Admin      | Mandatory    |
| NFR4 | Reliable data storage & backup       | Both roles | Nice-to-have |
| NFR5 | Easy system maintenance              | Both roles | Nice-to-Have |
| NFR6 | Secure login (password encryption)   | Both roles | Mandatory    |
| NFR7 | Handle multiple users simultaneously | Both roles | Nice-to-Have |

---

### 5. User Roles

| Role         | Description | Access                     |
| ------------ | ----------- | -------------------------- |
| Admin        | Librarian   | Full access                |
| Regular User | Member      | Search books, view history |

---

### 6. Use Case Diagram (Text Version)

<img src="https://raw.githubusercontent.com/HStackDev/LMS/refs/heads/main/srs_m/usecase.png">

### 7. MongoDB collections
- books
- borrow_records
- borrow_requests
- users


---

### 8. Priority

* Mandatory: Must be implemented for MVP
* Nice-to-Have: Can be added later

# User Stories

---

### F1 – Book Management

**User Story:**  
As an Admin (Librarian), I want to add, edit, view, and delete books, so that the library catalog stays accurate and up-to-date.

**Acceptance Criteria:**
- Admin can input book details (title, author, ISBN, category).
- Admin can edit or delete existing book records.
- Admin can view a full list of all available books.

---

### F2 – Member Management

**User Story:**  
As an Admin, I want to add, edit, and remove library members, so that membership records remain organized and current.

**Acceptance Criteria:**
- Admin can add new members with personal and contact info.
- Admin can edit or delete existing members.
- Admin can view a list of all registered members.

---

### F3 – Borrowing & Returning

**User Story:**  
As an Admin, I want to record book borrowing and returning transactions, so that I can track which member has borrowed which book and when it’s due.

**Acceptance Criteria:**
- System allows marking books as “borrowed” or “returned.”
- Borrowing date, due date, and member info are stored.
- Book availability updates automatically.

---

### F4 – Search Books

**User Story:**  
As a Member, I want to search for books by title, author, or category, so that I can quickly find books I’m interested in borrowing.

**Acceptance Criteria:**
- Search results show relevant books with basic details.
- Filters and keywords work correctly.
- Non-members get limited or read-only results.

---

### F5 – Reports

**User Story:**  
As an Admin, I want to generate reports on books and members, so that I can analyze borrowing trends and library performance.

**Acceptance Criteria:**
- Reports can be generated for specific time periods.
- Data includes borrowing frequency, top members, overdue books, etc.
- Reports can be downloaded or printed.

---

### F6 – Authentication

**User Story:**  
As a User, I want to securely log in to the system, so that I can access features based on my role (Admin or Member) and protect my account.

**Acceptance Criteria:**
- Users can log in with a valid username/email and password.
- Invalid credentials show appropriate error messages.
- Role-based access control is enforced (Admins vs Members).
- Passwords are stored securely (e.g., hashed).
- Sessions expire after a period of inactivity or logout.
- Option to reset forgotten passwords securely.

