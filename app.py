"""
Invoice Generator - Flask Backend
PDF via pdfkit + wkhtmltopdf (Windows compatible)
No database — ephemeral state only.
"""

from flask import Flask, render_template, request, jsonify, send_file
import pdfkit
import io
from datetime import datetime
import random
import string

app = Flask(__name__)

WKHTMLTOPDF_PATH = r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"


def generate_invoice_number():
    prefix = datetime.now().strftime("INV-%Y%m-")
    suffix = ''.join(random.choices(string.digits, k=4))
    return prefix + suffix


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/invoice-number")
def invoice_number():
    return jsonify({"invoice_number": generate_invoice_number()})


@app.route("/api/generate-pdf", methods=["POST"])
def generate_pdf():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Separate items to avoid Jinja dict.items() collision
    line_items = data.pop("items", [])

    try:
        html_content = render_template(
            "invoice_pdf.html", invoice=data, line_items=line_items
        )
    except Exception as e:
        return jsonify({"error": f"Template error: {str(e)}"}), 500

    config = pdfkit.configuration(wkhtmltopdf=WKHTMLTOPDF_PATH)
    options = {
        'page-size':    'A4',
        'margin-top':   '14mm',
        'margin-bottom':'10mm',
        'margin-left':  '14mm',
        'margin-right': '14mm',
        'encoding':     'UTF-8',
        'no-outline':   None,
        'quiet':        '',
    }

    try:
        pdf_bytes = pdfkit.from_string(
            html_content, False, configuration=config, options=options
        )
    except Exception as e:
        return jsonify({"error": f"wkhtmltopdf error: {str(e)}"}), 500

    pdf_buffer = io.BytesIO(pdf_bytes)
    pdf_buffer.seek(0)
    filename = f"{data.get('invoiceNumber', 'invoice')}.pdf"

    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
