import WorldCanvas from './canvas/WorldCanvas';
import ThemeToggle from './components/ThemeToggle';
import WorldScrubber from './components/WorldScrubber';
import BuildingModal from './components/BuildingModal';

export default function App() {
  return (
    <>
      <WorldCanvas />
      <ThemeToggle />
      <WorldScrubber />
      <BuildingModal />
    </>
  );
}
