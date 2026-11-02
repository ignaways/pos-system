import { createStore } from "../../lib/createStore";
import { cartReducer, emptyCart } from "./cartReducer";

/** Lives outside React so the open sale survives navigating to the back office and back. */
export const cartStore = createStore(cartReducer, emptyCart);
