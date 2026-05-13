import axios from 'axios';

const API_KEY = process.env.REACT_APP_EOS_API_KEY;

const instance = axios.create({
  headers: {
    'x-api-key': API_KEY,
  },
  responseType: 'blob', // Ensure we get the data as a Blob
});

export const fetchRenderImageUrl = async () => {
  const response = await instance.get('https://api-connect.eos.com/api/render/S2/36/U/XU/2016/5/2/0/B04,B03,B02/10/611/354');
  const imageUrl = URL.createObjectURL(response.data);
  return imageUrl;
};

export const fetchNdviImageUrl = async () => {
  const response = await instance.get('https://api-connect.eos.com/api/render/S2/36/U/XU/2016/5/2/0/NDVI/10/611/354');
  const imageUrl = URL.createObjectURL(response.data);
  return imageUrl;
};