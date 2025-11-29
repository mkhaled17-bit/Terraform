
const base = localStorage.getItem("base_url") || "http://localhost:5000";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token || role !== "admin") {
    alert("Access denied. Please login as admin.");
    window.location.href = "/";
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("base_url");
    window.location.href = "/";
}

function showTab(tab) {
    const sections = ["users", "books", "borrows"];
    sections.forEach(sec => {
        document.getElementById(`${sec}-section`).style.display = tab === sec ? "block" : "none";
        document.getElementById(`${sec.slice(0, -1)}-tab`).classList.toggle("active", tab === sec);
    });
}

async function safeParseJson(res) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
        try { return await res.json(); } catch { return {}; }
    }
    const text = await res.text();
    try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

function escapeHtml(s) {
    if (s === null || s === undefined) return "N/A";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ===== USERS =====
async function createUser() {
    const username = document.getElementById("user-username").value.trim();
    const password = document.getElementById("user-password").value.trim();
    const msg = document.getElementById("user-msg");
    if (!username || !password) return msg.textContent = "Username and password required";
    try {
        const res = await fetch(`${base}/api/admin/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ username, password })
        });
        const data = await safeParseJson(res);
        msg.textContent = res.ok ? "User created successfully" : (data.error || JSON.stringify(data));
    } catch (e) { msg.textContent = e.message; }
}

async function getUsers() {
    const msg = document.getElementById("user-msg");
    msg.textContent = "Loading...";
    try {
        const res = await fetch(`${base}/api/admin/users`, { headers: { "Authorization": "Bearer " + token } });
        const data = await safeParseJson(res);
        const users = Array.isArray(data) ? data : (data.users || []);
        const tbody = document.querySelector("#user-table tbody");
        tbody.innerHTML = "";
        users.forEach(u => {
            const id = u._id?.$oid || u._id || "N/A";
            const row = `<tr><td>${id}</td><td>${u.username}</td><td>${u.role}</td></tr>`;
            tbody.insertAdjacentHTML("beforeend", row);
        });
        msg.textContent = "Fetched users successfully";
    } catch (e) { msg.textContent = e.message; }
}

async function updateUser() {
    const id = document.getElementById("update-user-id").value.trim();
    const username = document.getElementById("update-username").value.trim();
    const password = document.getElementById("update-password").value.trim();
    const msg = document.getElementById("user-msg");

    if (!id) {
        msg.textContent = "User ID required.";
        return;
    }

    if (!username && !password) {
        msg.textContent = "Provide a new username or password.";
        return;
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (password) updateData.password = password;

    msg.textContent = "Updating user...";

    try {
        const res = await fetch(`${base}/api/admin/users/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(updateData)
        });

        const data = await safeParseJson(res);
        msg.textContent = res.ok
            ? "User updated successfully."
            : (data.error || JSON.stringify(data));

        if (res.ok) {
            document.getElementById("update-username").value = "";
            document.getElementById("update-password").value = "";
            getUsers();
        }

    } catch (e) {
        msg.textContent = e.message;
    }
}

async function deleteUser() {
    const id = document.getElementById("delete-user-id").value.trim();
    const msg = document.getElementById("user-msg");

    if (!id) {
        msg.textContent = "User ID required.";
        return;
    }

    if (!confirm("Are you sure you want to delete this user?")) return;

    msg.textContent = "Deleting user...";

    try {
        const res = await fetch(`${base}/api/admin/users/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await safeParseJson(res);
        msg.textContent = res.ok
            ? "User deleted successfully."
            : (data.error || JSON.stringify(data));

        if (res.ok) {
            document.getElementById("delete-user-id").value = "";
            getUsers(); // refresh list
        }

    } catch (e) {
        msg.textContent = e.message;
    }
}

// ===== BOOKS =====
async function createBook() {
    const fields = ["title", "author", "isbn", "category", "available_copies"];
    const msg = document.getElementById("book-msg");

    const values = {};
    for (const f of fields) {
        const el = document.getElementById("book-" + f);
        if (!el) {
            msg.textContent = `Input for ${f} not found`;
            return;
        }
        values[f] = el.value.trim();
    }

    if (Object.values(values).some(v => !v)) {
        msg.textContent = "All fields required";
        return;
    }

    // Convert available_copies to number
    values.available_copies = parseInt(values.available_copies, 10);
    if (isNaN(values.available_copies)) {
        msg.textContent = "available_copies must be a number";
        return;
    }

    msg.textContent = "Adding book...";

    try {
        const res = await fetch(`${base}/api/books`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(values)
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            msg.textContent = "Book added successfully";
            fields.forEach(f => document.getElementById("book-" + f).value = "");
            if (typeof getBooks === "function") await getBooks();
        } else {
            msg.textContent = data.error || JSON.stringify(data);
        }
    } catch (e) {
        msg.textContent = e.message;
    }
}


let allBooks = []; // cache to hold all books

async function getBooks() {
    const msg = document.getElementById("book-msg");
    msg.textContent = "Loading books...";
    try {
        const res = await fetch(`${base}/api/books`, { headers: { "Authorization": "Bearer " + token } });
        const data = await safeParseJson(res);
        const books = Array.isArray(data) ? data : (data.books || []);
        allBooks = books;
        renderBooks(books);
        msg.textContent = "Fetched books successfully";

        // show search bar after loading books
        showBookSearch();

    } catch (e) {
        msg.textContent = e.message;
    }
}

function renderBooks(books) {
    const tbody = document.querySelector("#book-table tbody");
    tbody.innerHTML = "";
    if (!books.length) {
        tbody.innerHTML = `<tr><td colspan="5">No books found</td></tr>`;
        return;
    }
    books.forEach(b => {
        const id = b._id?.$oid || b._id || "N/A";
        tbody.insertAdjacentHTML("beforeend",
            `<tr>
        <td>${id}</td>
        <td>${escapeHtml(b.title)}</td>
        <td>${escapeHtml(b.author)}</td>
        <td>${escapeHtml(b.category)}</td>
        <td>${b.available_copies ?? "N/A"}</td>
         </tr>`);
    });
}

function showBookSearch() {
    const container = document.getElementById("book-search-container");
    if (!container.querySelector("input")) {
        container.innerHTML = `
    <input id="book-search" type="text" placeholder="Search by title..." 
        oninput="searchBooks()" 
        style="padding:6px;width:50%;border:1px solid #ccc;border-radius:6px;">
`;
    }
}

function searchBooks() {
    const query = document.getElementById("book-search").value.trim().toLowerCase();
    if (!query) return renderBooks(allBooks);
    const filtered = allBooks.filter(b =>
        (b.title && b.title.toLowerCase().includes(query)) ||
        (b.author && b.author.toLowerCase().includes(query)) ||
        (b.category && b.category.toLowerCase().includes(query))
    );
    renderBooks(filtered);
}

// ===== BORROWS =====
// ===== FETCH BORROW RECORDS =====
async function getBorrows() {
    const msg = document.getElementById("borrow-msg");
    msg.textContent = "Loading borrow records...";

    function formatDate(d) {
        if (!d) return "-";
        const date = new Date(d);
        return isNaN(date) ? "-" : date.toLocaleDateString();
    }

    try {
        const res = await fetch(`${base}/api/borrow/admin/borrows`, {
            headers: { "Authorization": "Bearer " + token }
        });

        const data = await safeParseJson(res);
        console.log("Borrow records response:", data);

        const tbody = document.querySelector("#borrow-table tbody");
        tbody.innerHTML = "";

        if (!data.requested?.length && !data.borrowed?.length && !data.returned?.length) {
            tbody.innerHTML = `<tr><td colspan="8">No borrow records found</td></tr>`;
            msg.textContent = "No records found.";
            return;
        }

        const allRecords = [];

        // ----- Requested -----
        (data.requested || []).forEach(r => {
            allRecords.push({
                id: r._id,
                status: r.status || "N/A",
                username: r.username || "-",
                bookname: r.book_name || "-",
                available: r.available_quantity ?? "-",
                borrowDate: formatDate(r.requested_at?.$date || r.requested_at),
                dueDate: "-",
                returnDate: "-",
                actions: r.status === "pending" ? `
            <button class="action-btn approve" onclick="updateBorrow('${r._id}','approve')">Approve</button>
            <button class="action-btn reject" onclick="updateBorrow('${r._id}','reject')">Reject</button>` : "<span>-</span>"
            });
        });

        // ----- Borrowed -----
        (data.borrowed || []).forEach(b => {
            allRecords.push({
                id: b._id,
                status: b.status || "N/A",
                username: b.username || "-",
                bookname: b.book_name || "-",
                available: b.available_quantity ?? "-",
                borrowDate: formatDate(b.borrow_date?.$date || b.borrow_date),
                dueDate: formatDate(b.due_date?.$date || b.due_date),
                returnDate: formatDate(b.return_date?.$date || b.return_date),
                actions: b.status === "borrowed" ? `<button class="action-btn return" onclick="returnBorrow('${b._id}')">Mark Returned</button>` : "<span>-</span>"
            });
        });

        // ----- Returned -----
        (data.returned || []).forEach(r => {
            allRecords.push({
                id: r._id,
                status: r.status || "N/A",
                username: r.username || "-",
                bookname: r.book_name || "-",
                available: r.available_quantity ?? "-",
                borrowDate: formatDate(r.borrow_date?.$date || r.borrow_date),
                dueDate: formatDate(r.due_date?.$date || r.due_date),
                returnDate: formatDate(r.return_date?.$date || r.return_date),
                actions: "<span>-</span>"
            });
        });

        // Render all records
        allRecords.forEach(rec => {
            const row = `
        <tr data-id="${rec.id}">
            <td>${rec.status}</td>
            <td>${rec.username}</td>
            <td>${rec.bookname}</td>
            <td>${rec.available}</td>
            <td>${rec.borrowDate}</td>
            <td>${rec.dueDate}</td>
            <td>${rec.returnDate}</td>
            <td>${rec.actions}</td>
        </tr>`;
            tbody.insertAdjacentHTML("beforeend", row);
        });

        // ----- Add search functionality (only once) -----
        const headers = document.querySelectorAll("#borrow-table thead th");
        headers.forEach((th, index) => {
            if (!th.querySelector("input")) {  // prevent duplicates
                const input = document.createElement("input");
                input.type = "text";
                input.placeholder = "Search";
                input.style.width = "80%";
                input.addEventListener("input", () => {
                    const filter = input.value.toLowerCase();
                    tbody.querySelectorAll("tr").forEach(row => {
                        const cell = row.cells[index].textContent.toLowerCase();
                        row.style.display = cell.includes(filter) ? "" : "none";
                    });
                });
                th.appendChild(document.createElement("br"));
                th.appendChild(input);
            }
        });

        msg.textContent = "Borrow records loaded.";
    } catch (e) {
        console.error("Error fetching borrow records:", e);
        msg.textContent = e.message;
    }
}

// ===== APPROVE / REJECT =====
async function updateBorrow(borrowId, action) {
    if (!confirm(`Are you sure you want to ${action} this borrow request?`)) return;

    const msg = document.getElementById("borrow-msg");
    msg.textContent = `${action === "approve" ? "Approving" : "Rejecting"} borrow request...`;

    try {
        const res = await fetch(`${base}/api/borrow/request/${borrowId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ action })
        });

        const data = await safeParseJson(res);
        if (!res.ok) {
            msg.textContent = data.error || `Failed to ${action} request.`;
            return;
        }

        msg.textContent = `Borrow request ${action}d successfully.`;
        await getBorrows();
    } catch (err) {
        console.error("Error updating borrow:", err);
        msg.textContent = err.message;
    }
}

// ===== RETURN BORROW =====
async function returnBorrow(borrowId) {
    if (!confirm("Mark this borrow as returned?")) return;

    const msg = document.getElementById("borrow-msg");
    msg.textContent = "Marking borrow as returned...";

    try {
        const res = await fetch(`${base}/api/borrow/return/${borrowId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            }
        });

        const data = await safeParseJson(res);
        if (!res.ok) {
            msg.textContent = data.error || "Failed to mark as returned.";
            return;
        }

        msg.textContent = "Borrow marked as returned successfully.";
        await getBorrows();
    } catch (err) {
        console.error("Error returning borrow:", err);
        msg.textContent = err.message;
    }
}


