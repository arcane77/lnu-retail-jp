import * as React from "react";
import { useEffect, useState } from "react";
import { assets } from "../Assets";


const SpaceViewer = () => {
  const [space, setSpace] = useState(null);

  useEffect(() => {
    const newSpace = new smplr.Space({
      spaceId: "spc_i7v6cbdv",
      clientToken: "pub_45cf413215bd43f79621e0b28f8a815b",
      containerId: "test",
    });
    
    newSpace.startViewer({
      preview: false,
      allowModeChange: true,
      onReady: () => {},
      onError: (error) => console.error("Could not start viewer", error),
    });
    
    setSpace(newSpace);
  }, []);

  const showFirst = () => {
    if (!space) return;
    
    space.addDataLayer({
      id: "rooms",
      type: "polygon",
      data: assets.assets.slice(0, 1),
      tooltip: (d) => `${d.name} - ${d.id}`,
      color: "#6888be",
      alpha: 0.7,
      height: 2.9,
    });

    space.setCameraPlacement({
      alpha: -1.5750682689335684,
      beta: 0.65421918622319,
      radius: 77.01470199673722,
      target: {
        x: 71.3579622603224,
        y: 3,
        z: -48.0152734222641,
      },
      animated: true,
    });
  };

  const showSecond = () => {
    if (!space) return;
    
    space.addDataLayer({
      id: "rooms",
      type: "polygon",
      data: assets.assets.slice(1, 2),
      tooltip: (d) => `${d.name} - ${d.id}`,
      color: "#6888be",
      alpha: 0.7,
      height: 2.9,
    });
    
    space.setCameraPlacement({
      alpha: -1.5750682689335684,
      beta: 0.65421918622319,
      radius: 77.01470199673722,
      target: {
        x: 71.3579622603224,
        y: 3,
        z: -48.0152734222641,
      },
      animated: true,
    });
  };

  const showThird = () => {
    if (!space) return;
    
    space.addDataLayer({
      id: "rooms",
      type: "polygon",
      data: assets.assets.slice(2, 3),
      tooltip: (d) => `${d.name} - ${d.id}`,
      color: "#6888be",
      alpha: 0.7,
      height: 2.9,
    });

    space.setCameraPlacement({
      alpha: -1.5750682689335684,
      beta: 0.65421918622319,
      radius: 77.01470199673722,
      target: {
        x: 71.3579622603224,
        y: 3,
        z: -48.0152734222641,
      },
      animated: true,
    });
  };

  return (
    <>
      <div className="smplr-wrapper">
        <div id="test" className="smplr-embed"></div>
      </div>
      <button onClick={showFirst}>1</button>
      <button onClick={showSecond}>2</button>
      <button onClick={showThird}>3</button>
    </>
  );
};

export default SpaceViewer;