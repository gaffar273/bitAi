import os
import shutil
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

    def execute(self, _=None):
        # Check if the input folder even exists
        if not os.path.exists(self.input_folder):
            return {"output": f"Error: Folder '{self.input_folder}' not found.", "cost": 0}

        # 1. Look for PDFs
        files = [f for f in os.listdir(self.input_folder) if f.endswith(".pdf")]
        
        if not files:
            return {"output": "No new PDF found in 'pdf_doc'.", "cost": 0}

        filename = files[0]
        file_path = os.path.join(self.input_folder, filename)

        # 2. Extract Text
        print(f"[PDF Loader] Extracting text from: {filename}")
        try:
            loader = PyPDFLoader(file_path)
            docs = loader.load()
            full_text = " ".join([doc.page_content for doc in docs])

            # 3. Move to processed folder
            shutil.move(file_path, os.path.join(self.processed_folder, filename))
            print(f"[PDF Loader] {filename} archived to 'processed' folder.")

            return {
                "output": full_text,
                "cost": self.price
            }
        except Exception as e:
            return {"output": f"Failed to read PDF: {str(e)}", "cost": 0}