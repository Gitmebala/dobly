import {Composition} from "remotion";
import {DoblyMascotLoop} from "./scenes/DoblyMascotLoop";

export const RemotionRoot = () => {
  return (
    <Composition
      id="DoblyMascotLoop"
      component={DoblyMascotLoop}
      durationInFrames={180}
      fps={30}
      width={1280}
      height={1280}
    />
  );
};
