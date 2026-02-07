import os
import shutil
import base64
import tempfile
from langchain_community.document_loaders import PyPDFLoader

class PDFLoaderAgent:
    def __init__(self):
        # Use absolute paths to avoid "File Not Found" errors
        # This finds the 'BITAI' root directory regardless of where you run the script
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.input_folder = os.path.join(self.base_dir, "pdf_doc")
        self.processed_folder = os.path.join(self.input_folder, "processed")
        self.price = 0.01

        if not os.path.exists(self.processed_folder):
            os.makedirs(self.processed_folder)

    def execute(self, input_data=None):
        # Check if input has DB file content (Cloud mode)
        if isinstance(input_data, dict) and "file_content" in input_data:
            try:
                print(f"[PDF Loader] Processing file from DB input: {input_data.get('filename')}")
                file_content = base64.b64decode(input_data["file_content"])
                
                # Create temp file
                temp_pdf_path = ""
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
                    temp_pdf.write(file_content)
                    temp_pdf_path = temp_pdf.name
                    # File is closed here automatically when exiting 'with' block? 
                    # No, NamedTemporaryFile doesn't close on exit of context manager in all python versions if not used right, 
                    # but actually it DOES close only if we don't return. 
                    # Wait, standard practice: close explicitly or use context manager.
                    # The issue is PyPDFLoader opening it again.
                
                # Process temp file (now closed)
                try:
                    loader = PyPDFLoader(temp_pdf_path)
                    docs = loader.load()
                    full_text = " ".join([doc.page_content for doc in docs])
                    
                    # Clean up text - remove excessive whitespace
                    full_text = ' '.join(full_text.split())
                    
                    # Limit to ~50000 chars but cut at sentence boundary
                    max_length = 50000
                    if len(full_text) > max_length:
                        truncated = full_text[:max_length]
                        last_period = max(truncated.rfind('. '), truncated.rfind('! '), truncated.rfind('? '))
                        if last_period > max_length * 0.7:
                            full_text = truncated[:last_period + 1]
                        else:
                            full_text = truncated + "..."
                    
                    return {
                        "output": full_text,
                        "cost": self.price
                    }
                finally:
                    # Cleanup temp file
                    if os.path.exists(temp_pdf_path):
                        try:
                            os.remove(temp_pdf_path)
                        except:
                            pass
                        
            except Exception as e:
                return {"output": f"Failed to process PDF from DB: {str(e)}", "cost": 0}

        # LEGACY MODE: Scan disk folder
        # Check if the input folder even exists
        if not os.path.exists(self.input_folder):
            return {"output": f"Error: Folder '{self.input_folder}' not found. Upload a file via UI.", "cost": 0}

        # 1. Look for PDFs
        files = [f for f in os.listdir(self.input_folder) if f.endswith(".pdf")]
        
        if not files:
            return {"output": "No new PDF found in 'pdf_doc'. Please upload a file.", "cost": 0}

        filename = files[0]
        file_path = os.path.join(self.input_folder, filename)

        # 2. Extract Text
        print(f"[PDF Loader] Extracting text from local file: {filename}")
        try:
            loader = PyPDFLoader(file_path)
            docs = loader.load()
            full_text = " ".join([doc.page_content for doc in docs])
            
            # Clean up text - remove excessive whitespace
            full_text = ' '.join(full_text.split())
            
            # Limit to ~50000 chars but cut at sentence boundary
            max_length = 50000
            if len(full_text) > max_length:
                truncated = full_text[:max_length]
                last_period = max(truncated.rfind('. '), truncated.rfind('! '), truncated.rfind('? '))
                if last_period > max_length * 0.7:
                    full_text = truncated[:last_period + 1]
                else:
                    full_text = truncated + "..."

            # 3. Move to processed folder
            shutil.move(file_path, os.path.join(self.processed_folder, filename))
            print(f"[PDF Loader] {filename} archived to 'processed' folder.")

            return {
                "output": full_text,
                "cost": self.price
            }
        except Exception as e:
            return {"output": f"Failed to read PDF: {str(e)}", "cost": 0}