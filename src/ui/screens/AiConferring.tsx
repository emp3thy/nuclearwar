import { useEffect } from 'react';
import type { ScreenProps } from '../App';

export default function AiConferring({ dispatch }: ScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => dispatch({ type: 'AI_RESOLVE' }), 1500);
    return () => clearTimeout(timer);
  }, [dispatch]);
  return <div><h1>AI players are filing orders…</h1></div>;
}
