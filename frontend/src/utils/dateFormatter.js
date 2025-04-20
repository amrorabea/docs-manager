export const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  
  export const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };