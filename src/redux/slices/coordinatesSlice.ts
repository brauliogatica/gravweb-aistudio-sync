import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Coordinate } from '../../types/types';

interface CoordinatesState {
  coordinates: Coordinate[];
  centroid: Coordinate | null;
}

const initialState: CoordinatesState = {
  coordinates: [{ lat: -36.6066, lng: -72.1034 }, { lat: -36.6067, lng: -72.1035 }],
  centroid: null,
};

const coordinatesSlice = createSlice({
  name: 'coordinates',
  initialState,
  reducers: {
    setCoordinates: (state, action: PayloadAction<Coordinate[]>) => {
      state.coordinates = action.payload;
    },
    setCentroid(state, action: PayloadAction<Coordinate>) {
      state.centroid = action.payload;
    },
  },
});

export const { setCoordinates, setCentroid } = coordinatesSlice.actions;
export default coordinatesSlice.reducer;
