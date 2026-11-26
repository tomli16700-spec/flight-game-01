// Skylark Canyon Run — keyboard, mouse and touch input in one place.
// The game reads this module's state once a frame; it never touches the DOM
// event system anywhere else. Pointer events cover mouse and touch together.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    // Edge-triggered actions, consumed once per frame by the game loop.
    this.pressed = new Set();
    // Pointer steering: -1 (left) to 1 (right), and -1 (down) to 1 (up),
    // measured from the centre of the canvas while the pointer is down.
    this.pointerDown = false;
    this.pointerX = 0;
    this.pointerY = 0;
    // Mouse wheel adjusts the throttle; accumulated between frames.
    this.wheelDelta = 0;
    // Whether the pointer has steered recently; the game fades mouse
    // steering out when the pilot goes back to the keyboard.
    this.pointerAge = 999;

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.pressed.add(event.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointerDown = false;
    });

    canvas.addEventListener('pointerdown', (event) => {
      this.pointerDown = true;
      this.pointerAge = 0;
      this.updatePointer(event);
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.pointerDown) return;
      this.pointerAge = 0;
      this.updatePointer(event);
    });
    const release = () => {
      this.pointerDown = false;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('wheel', (event) => {
      this.wheelDelta += event.deltaY;
      event.preventDefault();
    }, { passive: false });
  }

  updatePointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    const ny = (event.clientY - rect.top) / rect.height;
    this.pointerX = Math.max(-1, Math.min(1, (nx - 0.5) * 2));
    // Up on the screen is up in the air.
    this.pointerY = Math.max(-1, Math.min(1, (0.5 - ny) * 2));
  }

  // -1 (roll left) to 1 (roll right). Keyboard and pointer blend.
  steerAxis() {
    let value = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) value -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) value += 1;
    if (this.pointerDown && this.pointerAge < 2) {
      value = this.pointerX;
    }
    return Math.max(-1, Math.min(1, value));
  }

  // -1 (descend) to 1 (climb).
  climbAxis() {
    let value = 0;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) value -= 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) value += 1;
    if (this.pointerDown && this.pointerAge < 2) {
      value = this.pointerY;
    }
    return Math.max(-1, Math.min(1, value));
  }

  // -1 (throttle down) to 1 (throttle up) from keys and wheel.
  throttleAxis() {
    let value = 0;
    if (this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyC')) value -= 1;
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('KeyV')) value += 1;
    if (this.wheelDelta !== 0) {
      value += this.wheelDelta > 0 ? -0.5 : 0.5;
      this.wheelDelta = 0;
    }
    return Math.max(-1, Math.min(1, value));
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  // Call once at the end of each frame so edge presses do not linger.
  endFrame() {
    this.pressed.clear();
    this.pointerAge += 1;
  }
}
