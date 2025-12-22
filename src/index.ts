import {generateCollatzSequenceAdic} from "./math";

for (let i = 5; i < 20; i++) {
    console.log(generateCollatzSequenceAdic(i, {}, { mode: "full" }));
}