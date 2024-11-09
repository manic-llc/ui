import { get, post, del } from './api';
import * as ls from './storage';

function userId() {
  return ls.get('5HT.AUDIUS/AUTH')?.user?.userId as ':userId';
}

export async function getUser(id = userId()) {
  try {
    const { data } = await get(`audius/users/${id}/id`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function getUserByHandle(handle: ':handleId') {
  try {
    const { data } = await get(`audius/users/${handle}/handle`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function getRelatedUsers(id = userId(), limit = 10) {
  try {
    const { data } = await get(`audius/users/${id}/related?limit=${limit}` as any);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function getFavorites() {
  try {
    const { data } = await get(`audius/users/${userId()}/favorites`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function favoriteTrack(trackId: ':trackId') {
  try {
    const { data } = await post(`audius/users/${userId()}/favorites/tracks/${trackId}`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function unfavoriteTrack(trackId: ':trackId') {
  try {
    const { data } = await del(`audius/users/${userId()}/favorites/tracks/${trackId}`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function favoritePlaylist(playlistId: ':playlistId') {
  try {
    const { data } = await post(`audius/users/${userId()}/favorites/playlists/${playlistId}`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function unfavoritePlaylist(playlistId: ':playlistId') {
  try {
    const { data } = await del(`audius/users/${userId()}/favorites/playlists/${playlistId}`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function favoriteAlbum(albumId: ':albumId') {
  try {
    const { data } = await post(`audius/users/${userId()}/favorites/albums/${albumId}`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function unfavoriteAlbum(albumId: ':albumId') {
  try {
    const { data } = await del(`audius/users/${userId()}/favorites/albums/${albumId}`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function getFollowers(id = userId()) {
  try {
    const { data } = await get(`audius/users/${id}/followers`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function getFollowing(id = userId()) {
  try {
    const { data } = await get(`audius/users/${id}/following`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function getTrendingPlaylists(time: 'week' | 'month' | 'year' | 'allTime') {
  try {
    const { data } = await get(`audius/trending/playlists/${time as ':time'}`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function getTrendingTracks(time: 'week' | 'month' | 'year' | 'allTime') {
  try {
    const { data } = await get(`audius/trending/tracks/${time as ':time'}`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function getPlaylistTracks(playlistId: ':playlistId') {
  try {
    const { data } = await get(`audius/playlists/${playlistId}/tracks`);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}

export async function getTracksByUser(id = userId(), limit = 5) {
  try {
    const { data } = await get(`audius/users/${id}/tracks?limit=${limit}&sort_method=plays&filter_tracks=public` as any);
    // console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}
