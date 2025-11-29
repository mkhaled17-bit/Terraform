# LMS

This is the backend of a Library Management System built with **Flask** and **MongoDB**.

---

##  Prerequisites

- Python 3.10+  
- MongoDB running locally (`mongodb://localhost:27017`)  
- Git  

---

##  Setup

1. **Clone the repository**

```
git clone https://github.com/HStackDev/LMS.git
cd LMS
cd backend
```

2. **Create a virtual environment**

```
python -m venv venv
```

3. **Activate the virtual environment**

- **Linux/macOS:**

```
source venv/bin/activate
```

- **Windows:**

```
venv\Scripts\activate
```

4. **Install dependencies**

```
pip install -r backend/requirements.txt
```

- **Environment Setup**
```
touch .env
nano .env

# Server port
PORT=4040

# MongoDB connection string
DB=mongodb://localhost:27017/lms

# Secret key for your app (JWT, sessions, etc.)
SECRET_KEY=supersecretkey
```

---



5. ##  Run the Server

```
python run.py
```

