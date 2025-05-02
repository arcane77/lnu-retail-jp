declare namespace smplr {
    class Editor {
      constructor(config: {
        spaceId: string;
        user: {
          id: string;
          name: string;
          picture: string;
        };
        clientToken: string;
        containerId: string;
      });
      startSession(): void;
    }
  }
  
  declare const smplr: {
    Editor: typeof smplr.Editor;
  };