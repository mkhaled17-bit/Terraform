        const base = localStorage.getItem("base_url") || "http://localhost:5000";
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");

        if (!token || role !== "user") {
            alert("Access denied. Please login as a user.");
            window.location.href = "/";
        }

        function logout() {
            // Clear stored session data
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("base_url");

            // Redirect to backend login route
            window.location.href = `/`;
        }

        async function safeParseJson(res) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                try { return await res.json(); } catch (e) { return {}; }
            }
            const text = await res.text();
            try { return text ? JSON.parse(text) : {}; } catch { return {}; }
        }

        // Load all books when page opens
        document.addEventListener("DOMContentLoaded", () => {
            getBooks();
            getMyBorrows();
        });

        let allBooks = [];

        const requestCounts = {};

        async function getBooks() {
            const msg = document.getElementById("book-msg");
            msg.textContent = "Loading books...";
            try {
                const res = await fetch(`${base}/api/books`, {
                    headers: { "Authorization": "Bearer " + token }
                });
                const data = await safeParseJson(res);
                allBooks = Array.isArray(data) ? data : (data.books || data.data || []);

                // Initialize request counts for each book if not already
                allBooks.forEach(book => {
                    if (!(book._id in requestCounts)) requestCounts[book._id] = 0;
                });

                renderBooks(allBooks);
                msg.textContent = "Books loaded.";
            } catch (e) {
                msg.textContent = e.message || String(e);
            }
        }

        function renderBooks(books) {
            const tbody = document.querySelector("#book-table tbody");
            tbody.innerHTML = "";

            books.forEach(book => {
                const row = `
            <tr data-id="${book._id}">
                <td>${book.title}</td>
                <td>${book.author || "-"}</td>
                <td>${book.category || "-"}</td>
                <td>${book.available_copies || "-"}</td>
                <td class="request-count">${requestCounts[book._id]}</td>
                <td>
                    <button class="borrow-btn" onclick="borrowBook('${book._id}')">Borrow</button>
                </td>
            </tr>
        `;
                tbody.insertAdjacentHTML("beforeend", row);
            });
        }

        async function borrowBook(bookId) {
            const msg = document.getElementById("book-msg");

            // Find the book in allBooks to check availability
            const book = allBooks.find(b => b._id === bookId);
            if (!book) {
                msg.textContent = "Book not found.";
                return;
            }

            if ((book.available_copies || 0) <= 0) {
                msg.textContent = "Cannot borrow: No available copies.";
                return;
            }

            msg.textContent = "Sending borrow request...";

            try {
                const res = await fetch(`${base}/api/borrow/request`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },
                    body: JSON.stringify({ book_id: bookId })
                });
                const data = await safeParseJson(res);

                if (res.ok) {
                    msg.textContent = "Borrow request sent successfully!";

                    // Increment the request count locally
                    requestCounts[bookId] = (requestCounts[bookId] || 0) + 1;

                    // Update the cell in the table
                    const row = document.querySelector(`#book-table tbody tr[data-id='${bookId}']`);
                    if (row) {
                        const cell = row.querySelector(".request-count");
                        if (cell) cell.textContent = requestCounts[bookId];
                    }

                    getMyBorrows(); // optional: refresh user's borrows
                } else {
                    msg.textContent = data.error || JSON.stringify(data);
                }
            } catch (e) {
                msg.textContent = e.message || String(e);
            }
        }

        function filterBooks() {
            const term = document.getElementById("search").value.toLowerCase();
            const filtered = allBooks.filter(b =>
                (b.title || "").toLowerCase().includes(term) ||
                (b.author || "").toLowerCase().includes(term) ||
                (b.category || "").toLowerCase().includes(term)
            );
            renderBooks(filtered);
        }


        async function getMyBorrows() {
            const msg = document.getElementById("borrow-msg");
            msg.textContent = "Loading your borrowed books...";
            try {
                const res = await fetch(`${base}/api/borrow/my-borrows`, {
                    headers: { "Authorization": "Bearer " + token }
                });
                const data = await safeParseJson(res);
                const borrows = Array.isArray(data) ? data : (data.borrows || data.data || []);
                const tbody = document.querySelector("#borrow-table tbody");
                tbody.innerHTML = "";

                borrows.forEach(b => {
                    // handle extended JSON dates
                    const borrowDate = b.borrow_date?.$date || b.borrow_date || "N/A";
                    const returnDate = b.return_date?.$date || b.due_date?.$date || b.return_date || b.due_date || "N/A";
                    const status = b.status || "N/A";

                    // try to find book title
                    const bookId = b.book_id?._id || b.book_id || "N/A";
                    let title = b.book_title || "N/A";
                    if (title === "N/A" && Array.isArray(allBooks)) {
                        const match = allBooks.find(x => x._id === bookId || x._id?.$oid === bookId);
                        if (match) title = match.title || "N/A";
                    }

                    // format dates for display
                    const borrowStr = borrowDate !== "N/A" ? new Date(borrowDate).toLocaleDateString() : "N/A";
                    const returnStr = returnDate !== "N/A" ? new Date(returnDate).toLocaleDateString() : "N/A";

                    const row = `<tr>
        <td>${escapeHtml(title)}</td>
        <td>${escapeHtml(borrowStr)}</td>
        <td>${escapeHtml(returnStr)}</td>
        <td>${escapeHtml(status)}</td>
      </tr>`;
                    tbody.insertAdjacentHTML("beforeend", row);
                });

                msg.textContent = "Borrowed books loaded.";
            } catch (e) { msg.textContent = e.message || String(e); }
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
