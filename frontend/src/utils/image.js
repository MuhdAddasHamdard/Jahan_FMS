const MAX_EDGE = 256;
const DEFAULT_QUALITY = 0.82;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read that image file"));
    reader.readAsDataURL(file);
  });

const loadImage = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That file is not a valid image"));
    image.src = dataUrl;
  });

export const fileToAvatarDataUrl = async (file) => {
  if (!file) {
    throw new Error("No image selected");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (PNG or JPG)");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("That image is too large. Please choose one under 8 MB.");
  }

  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const compressed = canvas.toDataURL("image/jpeg", DEFAULT_QUALITY);
  return compressed.length > dataUrl.length ? dataUrl : compressed;
};
