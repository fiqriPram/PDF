import os
import time
from uuid import uuid4
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- Directory Configuration ---
# Assuming this script is running in backend/converter-service/
# We want to access shared-storage relative to the Project Root (PDF/)
# Project Structure:
# PDF/
#   backend/
#     converter-service/
#       app.py
#   shared-storage/
#     results/
#     uploads/

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Go up two levels to reach 'PDF' root from 'converter-service' (if in backend/converter-service)
# Actually, let's just find shared-storage.
# If app is in PDF/backend/converter-service/app.py:
# .. -> backend
# .. -> PDF
# PDF/shared-storage
SHARED_STORAGE = os.path.abspath(os.path.join(BASE_DIR, '../../shared-storage'))
UPLOAD_DIR = os.path.join(SHARED_STORAGE, 'uploads')
RESULT_DIR = os.path.join(SHARED_STORAGE, 'results')

# Ensure directories exist
for d in [UPLOAD_DIR, RESULT_DIR]:
    os.makedirs(d, exist_ok=True)

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Indenter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.units import inch, cm
import docx

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Indenter, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
import docx
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl

# Import docx2pdf
try:
    from docx2pdf import convert as convert_to_pdf_word
    DOCX2PDF_AVAILABLE = True
except ImportError:
    DOCX2PDF_AVAILABLE = False
    print("docx2pdf not available, falling back to manual engine.")

def simulate_word_to_pdf(input_path, output_name):
    print(f"Starting conversion for: {input_path}")
    
    result_path = os.path.join(RESULT_DIR, output_name)
    
    # METHOD 1: Try Native Word Conversion (docx2pdf)
    # This gives 1:1 "iLovePDF" quality.
    if DOCX2PDF_AVAILABLE and (input_path.endswith('.docx') or input_path.endswith('.doc')):
        try:
            print("Attempting Native Word Conversion...")
            # docx2pdf requires absolute paths
            abs_input = os.path.abspath(input_path)
            abs_output = os.path.abspath(result_path)
            
            convert_to_pdf_word(abs_input, abs_output)
            
            if os.path.exists(abs_output):
                print("Native conversion successful!")
                return result_path
        except Exception as e:
            print(f"Native Word conversion failed ({e}). Falling back to manual engine.")
    
    # METHOD 2: Manual ReportLab Construction (Fallback)
    # Re-implements document structure if Native conversion fails
    try:
        # Standard Margins
        doc_pdf = SimpleDocTemplate(result_path, pagesize=letter,
                                  rightMargin=72, leftMargin=72,
                                  topMargin=72, bottomMargin=72)
        
        styles = getSampleStyleSheet()
        # Custom Font - Times New Roman lookalike
        base_style = ParagraphStyle(
            'FormalStyle',
            parent=styles["Normal"],
            fontName='Times-Roman',
            fontSize=11,
            leading=14,
            spaceAfter=4
        )
        
        # Title Style
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=base_style,
            fontName='Times-Bold',
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=12
        )

        story = []

        if input_path.endswith('.docx') or input_path.endswith('.doc'):
            try:
                doc_source = docx.Document(input_path)
                
                # Iterate through all elements (Paragraphs AND Tables)
                for element in doc_source.element.body:
                    if isinstance(element, CT_P):
                        # --- Process Paragraph ---
                        para = docx.text.paragraph.Paragraph(element, doc_source)
                        text = para.text.strip()
                        
                        if not text:
                            story.append(Spacer(1, 6))
                            continue
                            
                        # Alignment
                        align_map = {0: TA_LEFT, 1: TA_CENTER, 2: TA_RIGHT, 3: TA_JUSTIFY, None: TA_LEFT}
                        alignment = align_map.get(para.alignment, TA_LEFT)

                        # Check if it is a title (Center + Bold prediction or Short text)
                        if alignment == TA_CENTER or (len(text) < 50 and "SURAT" in text.upper()):
                            story.append(Paragraph(text, title_style))
                            continue

                        # Special Handling for "Key : Value" lines to align colons (only if Left aligned)
                        # e.g., "Nama : Budi" -> Table
                        if alignment == TA_LEFT and ":" in text and len(text.split(":")) == 2:
                            parts = text.split(":", 1)
                            key = parts[0].strip()
                            val = parts[1].strip()
                            # 30% for Key, 5% for Colon, 65% for Value
                            data = [[key, ":", val]]
                            t = Table(data, colWidths=[1.5*inch, 0.2*inch, 4.5*inch])
                            t.setStyle(TableStyle([
                                ('FONTNAME', (0,0), (-1,-1), 'Times-Roman'),
                                ('FONTSIZE', (0,0), (-1,-1), 11),
                                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                                ('LEFTPADDING', (0,0), (-1,-1), 0),
                                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                            ]))
                            story.append(t)
                            continue

                        # Normal Paragraph with Indent handling
                        left_indent = 0
                        if para.paragraph_format.left_indent:
                            try: left_indent = para.paragraph_format.left_indent.pt
                            except: pass
                            
                        p_style = ParagraphStyle(
                            f' P-{uuid4().hex}',
                            parent=base_style,
                            alignment=alignment,
                            leftIndent=left_indent
                        )
                        story.append(Paragraph(text, p_style))

                    elif isinstance(element, CT_Tbl):
                        # --- Process Table ---
                        table = docx.table.Table(element, doc_source)
                        # Extract data
                        data = []
                        for row in table.rows:
                            row_data = []
                            for cell in row.cells:
                                # Join all paragraphs in cell
                                cell_text = "\n".join([p.text for p in cell.paragraphs]).strip()
                                row_data.append(Paragraph(cell_text, base_style))
                            data.append(row_data)
                        
                        if data:
                            # Create ReportLab Table
                            # Auto calculate widths? For now, distribute evenly or auto
                            col_count = len(data[0])
                            # Approx width
                            available_width = 6.5 * inch
                            col_width = available_width / col_count
                            
                            t = Table(data, colWidths=[col_width]*col_count)
                            t.setStyle(TableStyle([
                                ('GRID', (0,0), (-1,-1), 0.5, colors.black), # Show borders
                                ('FONTNAME', (0,0), (-1,-1), 'Times-Roman'),
                                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                                ('LEFTPADDING', (0,0), (-1,-1), 4),
                                ('RIGHTPADDING', (0,0), (-1,-1), 4),
                            ]))
                            story.append(t)
                            story.append(Spacer(1, 12))

            except Exception as e:
                print(f"Docx Error: {e}")
                story.append(Paragraph(f"Error processing content: {e}", styles["Error"]))
        else:
             try:
                with open(input_path, 'r', errors='ignore') as f:
                    for line in f:
                        story.append(Paragraph(line.strip(), base_style))
             except: pass

        doc_pdf.build(story)
        
    except Exception as e:
        print(f"Error generating PDF: {e}")
        with open(result_path, 'w') as f:
             f.write("Error.")

    return result_path
    
@app.route('/convert', methods=['POST'])
def convert():
    # Check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = file.filename
        input_path = os.path.join(UPLOAD_DIR, filename)
        file.save(input_path)
        
        try:
            # Generate output filename
            output_filename = os.path.splitext(filename)[0] + '.pdf'
            
            # Call conversion function
            final_path = simulate_word_to_pdf(input_path, output_filename)
            
            # Return JSON with download URL
            return jsonify({
                'status': 'success',
                'downloadUrl': f'http://localhost:5000/download/{output_filename}',
                'fileName': output_filename
            })
            
        except Exception as e:
            print(f"Conversion Error: {e}")
            return jsonify({'error': str(e)}), 500

@app.route('/download/<path:filename>', methods=['GET'])
def download(filename):
    try:
        return send_file(os.path.join(RESULT_DIR, filename), as_attachment=True)
    except Exception as e:
        return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    app.run(port=5000, debug=True)