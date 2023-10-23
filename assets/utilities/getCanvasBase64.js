const getCanvasBase64 = () => {
  const canvas = document.querySelector('#scene canvas');
  const dataURL = canvas.toDataURL();
  return dataURL;
};

export default getCanvasBase64;
