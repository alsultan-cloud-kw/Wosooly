import ThemeReducer from "./ThemeReducer"
import AuthReducer from "./AuthReducer"
import { combineReducers } from "redux"


const rootReducer = combineReducers({ThemeReducer, AuthReducer})

export default rootReducer