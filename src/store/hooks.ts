import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '.';

// Типизированный useDispatch
export const useAppDispatch: () => AppDispatch = useDispatch;

// Типизированный useSelector
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
