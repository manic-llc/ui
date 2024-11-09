import bezier from './bezier';
import { DEFAULT_EASING, EASE_IN_OUT } from '@constants/easing';
import { clamp } from './numbers';

const appliedDefault = bezier(DEFAULT_EASING[0], DEFAULT_EASING[1], DEFAULT_EASING[2], DEFAULT_EASING[3]);
const appliedEaseInOut = bezier(EASE_IN_OUT[0], EASE_IN_OUT[1], EASE_IN_OUT[2], EASE_IN_OUT[3]);

export function ease(progress: number) {
  return appliedDefault(clamp(progress));
}

export function easeInOut(progress: number) {
  return appliedEaseInOut(clamp(progress));
}
