import {generateCollatzSequenceAdic} from "./math";

for (let i = 5; i < 20; i++) {
    const result = generateCollatzSequenceAdic(
        i,
        {},
        { mode: "oddOnly" }
    );

    console.log(result);
}