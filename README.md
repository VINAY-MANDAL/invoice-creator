# InvoiceFlow — SaaS Invoice Generator

**Stack:** Flask (Python) + Vanilla JS/CSS/HTML  
**PDF:** WeasyPrint (server-side, A4)

## Project Structure

```
invoice-generator/
├── app.py                  # Flask app + routes
├── requirements.txt
├── templates/
│   ├── index.html          # Main wizard UI
│   └── invoice_pdf.html    # WeasyPrint PDF template
└── static/
    ├── css/style.css
    └── js/main.js
```

## Setup

```bash
# 1. Create & activate virtual env (recommended)
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. WeasyPrint may need system libs on Linux:
#    sudo apt install libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0

# 4. Run
python app.py
```

Open: http://localhost:5000

## Features

- 4-step wizard (Seller → Customer → Items → Preview)
- Auto-generated invoice number (INV-YYYYMM-XXXX)
- All Indian states & UTs in dropdown
- Live subtotal / GST / grand total calculation
- Live invoice preview before download
- Server-side A4 PDF via WeasyPrint
- Client-side validation on every step
- No database — fully stateless

## Upgrading

| Want to add | Where |
|---|---|
| Email sending | `app.py` — new `/api/send-email` route |
| Logo upload | Step 1 form + `invoice_pdf.html` |
| Invoice history | Replace ephemeral state with SQLite |
| Auth/login | Flask-Login + any ORM |
| Multiple tax slabs | Extend item row in `index.html` + `main.js` |
