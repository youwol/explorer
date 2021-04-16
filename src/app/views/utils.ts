import { Favorite } from '../data'

export function getStoredFavorites(): Array<Favorite> {
    let favoritesStr = localStorage.getItem('favorites') 
    let favorites = favoritesStr ? JSON.parse(favoritesStr) : []
    return favorites as Array<Favorite>
}
