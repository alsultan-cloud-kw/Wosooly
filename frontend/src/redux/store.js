import { configureStore, combineReducers } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { persistStore, persistReducer } from "redux-persist";

import AuthReducer from "./reducers/AuthReducer";
import ThemeReducer from "./reducers/ThemeReducer"; // import your theme reducer

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"], // persist only auth
};

const rootReducer = combineReducers({
  auth: AuthReducer,
  theme: ThemeReducer, // <--- add theme slice here
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Optional: preloaded state for auth
const preloadedState = {
  auth: {
    token: localStorage.getItem("token"),
    email: localStorage.getItem("email"),
    isAuthenticated: !!localStorage.getItem("token"),
    loading: false,
    error: null,
  },
  theme: {
    mode: "light", // default
    color: "#00bcd4", // default
  },
};

export const store = configureStore({
  reducer: persistedReducer,
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
