import React from 'react';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import './DocumentViewer.css';

const DocumentViewer = ({ fileUrl, onClose }) => {
  const docs = [{ uri: fileUrl }];

  return (
    <div className="document-viewer-overlay">
      <div className="document-viewer-container">
        <div className="document-viewer-header">
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>
        <div className="document-viewer-content">
          <DocViewer 
            documents={docs}
            pluginRenderers={DocViewerRenderers}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;