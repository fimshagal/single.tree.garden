export const onDocReady = async (): Promise<any> => {
    return await new Promise((resolve) => {
        document.addEventListener("DOMContentLoaded", resolve);
    });
};