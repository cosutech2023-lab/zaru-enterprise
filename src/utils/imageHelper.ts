export interface CompressedImageResult {
  dataUrl: string;
  name: string;
  type: string;
  size: number;
}

export const compressImageFile = async (
  file: File, 
  maxDimension = 1200, 
  quality = 0.8
): Promise<CompressedImageResult> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          dataUrl: e.target?.result as string,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({
            dataUrl,
            name: file.name,
            type: 'image/jpeg',
            size: Math.round((dataUrl.length * 3) / 4)
          });
        } else {
          resolve({
            dataUrl: e.target?.result as string,
            name: file.name,
            type: file.type,
            size: file.size
          });
        }
      };
      img.onerror = () => {
        resolve({
          dataUrl: e.target?.result as string,
          name: file.name,
          type: file.type,
          size: file.size
        });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
