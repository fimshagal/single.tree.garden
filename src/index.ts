import {generateCollatzSequenceAdic} from "./math";
import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer, updateRenderer} from "./draw";
import {exefe} from "./misc";

exefe(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });



    updateRenderer({
        sequence: generateCollatzSequenceAdic(8).sequence,
        color: 0xff0000,
    });
    updateRenderer({
        sequence: generateCollatzSequenceAdic(12).sequence,
        color: 0x00ffcc,
    });
    updateRenderer({
        sequence: generateCollatzSequenceAdic(16).sequence,
        color: 0xffffff,
    });
    //
    updateRenderer({
        sequence: generateCollatzSequenceAdic(32).sequence,
        color: 0xff0000,
    });
    updateRenderer({
        sequence: generateCollatzSequenceAdic(48).sequence,
        color: 0x00ffcc,
    });
    updateRenderer({
        sequence: generateCollatzSequenceAdic(64).sequence,
        color: 0xffffff,
    });
    //
    updateRenderer({
        sequence: generateCollatzSequenceAdic(128).sequence,
        color: 0xff0000,
    });
    updateRenderer({
        sequence: generateCollatzSequenceAdic(192).sequence,
        color: 0x00ffcc,
    });
    updateRenderer({
        sequence: generateCollatzSequenceAdic(256).sequence,
        color: 0xffffff,
    });
    //
    updateRenderer({
        sequence: generateCollatzSequenceAdic(128).sequence,
        color: 0xff0000,
    });
    updateRenderer({
        sequence: generateCollatzSequenceAdic(192).sequence,
        color: 0x00ffcc,
    });
    updateRenderer({
        sequence: generateCollatzSequenceAdic(256).sequence,
        color: 0xffffff,
    });
    //
    updateRenderer({
        sequence: generateCollatzSequenceAdic(512).sequence,
        color: 0xff0000,
    });
    updateRenderer({
        sequence: generateCollatzSequenceAdic(768).sequence,
        color: 0x00ffcc,
    });
    updateRenderer({
        sequence: generateCollatzSequenceAdic(1024).sequence,
        color: 0xffffff,
    });
});