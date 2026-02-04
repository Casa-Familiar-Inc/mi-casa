import { jsPDF } from 'jspdf';

export const loadLogoBase64 = async (url: string = '/casa_logo.png'): Promise<string | null> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to load logo", e);
        return null;
    }
};

export const addLogoToPDF = (doc: jsPDF, logoData: string | null, pageWidth: number) => {
    if (logoData) {
        // Assume logo is roughly square or landscape. Let's fit it.
        // x, y, w, h
        // Center text is at 15 (y). Logo might be to the left or above?
        // Let's put it on the left: x=14, y=10, w=15, h=15?
        // Or centered above title?

        // "Casa Familiar" text is at y=15.
        // Let's put logo at x=14, y=5, w=20, h=20 (approx).
        doc.addImage(logoData, 'PNG', 14, 5, 20, 20);
    }
};
