// Map value, not string[]: membership is O(1) instead of the O(n) `cardIds.includes(id)` per
// row this set removes (set-8-plan §1.2 #4 / §4.2). The payload carries the key + set so a card
// selected on one page can still be named on another page and in the submit-conflict list,
// where the server response only returns ids.
export interface SelectedCard {
  key: string;
  setId: string;
  setNumber: string;
}
