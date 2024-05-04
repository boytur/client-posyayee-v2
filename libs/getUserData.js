const jwt = require('jsonwebtoken');

const getUserStoreId = async (req) => {

    if (!req) { return; }
    const userTokenCookies = req.cookies.access_token;

    if (!userTokenCookies) {
        return;
    }

    const decoded = jwt.decode(userTokenCookies);
    const storeId = decoded?.user?.store?.store_id;
    return storeId;
}

const getStoreRemaining = async (req) => {

    if (!req) { return; }
    const userTokenCookies = req.cookies.access_token;

    if (!userTokenCookies) {
        return;
    }

    const decoded = await jwt.decode(userTokenCookies);
    const storeRemaining = decoded?.user?.store?.store_remaining;
    return storeRemaining;
};

const getStorePackageId = async (req) => {

    if (!req) { return; }
    const userTokenCookies = req.cookies.access_token;

    if (!userTokenCookies) {
        return;
    }

    const decoded = await jwt.decode(userTokenCookies);
    const getStorePackageId = decoded?.user?.store?.package_id;
    return getStorePackageId;
};

module.exports = { getUserStoreId, getStoreRemaining, getStorePackageId }