import {outputMultipleOf} from "./multiple.of.ts";

// 27 peak based

export const outputScaryPeakAlpha = (): void => {
    outputMultipleOf(1, 27, 27); // 27
    outputMultipleOf(2, 27, 27); // 54
    outputMultipleOf(3, 9, 9); // 27
    outputMultipleOf(4, 27, 27); // 108
    outputMultipleOf(5, 11, 11); // 55
    outputMultipleOf(6, 9, 9); // 54
    outputMultipleOf(7, 9, 9); // 63
    outputMultipleOf(8, 27, 27); // 216
    outputMultipleOf(9, 3, 3); // 27
    outputMultipleOf(10, 11, 11); // 110
    outputMultipleOf(11, 10, 10); // 110
    outputMultipleOf(12, 9, 9); // 110
    outputMultipleOf(27, 1, 1); // 37
    outputMultipleOf(31, 1, 1); // 31
    outputMultipleOf(54, 1, 1); // 54
    outputMultipleOf(55, 1, 1); // 55
    outputMultipleOf(63, 1, 1); // 63
    outputMultipleOf(108, 1, 1); // 108
    outputMultipleOf(171, 1, 1); // 171
};