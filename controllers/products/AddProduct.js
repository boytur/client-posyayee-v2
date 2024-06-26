const { ProductCacheClear } = require("../../cache/Product");
const { cache } = require("../../connections/redis");
const { getUserStoreId, getStorePackageId } = require("../../libs/getUserData");
const uploadToB2 = require("../../libs/uploadB2");
const uploadToCloundflare = require("../../libs/uploadToCloundflare");
const { validateInteger } = require("../../libs/validate");
const alertStoreRemaining = require("../../middlewares/alertStoreRemaining");
const Categories = require("../../models/Categories");
const Package = require("../../models/Package");
const Product = require("../../models/Product");
const ProductUnit = require("../../models/ProductUnit");
const Promotion = require("../../models/Promotion");
const Store = require("../../models/Store");
const User = require("../../models/User");

const AddProduct = async (req, res) => {

    try {
        const {
            auto_generate_barcode,
            prod_barcode,
            prod_name,
            prod_cost,
            prod_sale,
            prod_quantity,
            prod_image,
            cat_id,
            unit_id,
        } = req.body;

        const alertResponse = await alertStoreRemaining(req, res);
        if (alertResponse) {
            return;
        }

        if (!prod_name || !prod_quantity || !prod_cost || !prod_sale || !unit_id || !cat_id) {
            return res.status(400).json({
                success: false,
                message: "กรุณากรอกข้อมูลสินค้าให้ครบถ้วน!"
            });
        }

        const storeId = await getUserStoreId(req);

        if (prod_barcode && prod_barcode?.length !== 13) {
            return res.status(400).json({
                success: false,
                message: "บาร์โค้ดต้องมี 13 หลักค่ะ!"
            });
        }

        if (cat_id && !validateInteger(cat_id)) {
            return res.status(400).json({
                success: false,
                message: 'ไม่มีประเภทสินค้านี้ในระบบ!'
            });
        }

        if (cat_id) {
            const existingCategories = await Categories.findAll({
                where: {
                    cat_id: parseInt(cat_id),
                    store_id: storeId
                }
            });

            if (existingCategories?.length <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่มีประเภทสินค้านี้ในระบบ!'
                });
            }
        }
        if (unit_id && !validateInteger(unit_id)) {
            return res.status(400).json({
                success: false,
                message: 'ไม่มีหน่วยเรียกสินค้านี้ในระบบ!'
            });
        }

        if (unit_id) {
            const existingUnit = await ProductUnit.findAll({
                where: {
                    unit_id: parseInt(unit_id),
                    store_id: storeId
                }
            });

            if (existingUnit?.length <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่มีหน่วยเรียกสินค้านี้ในระบบ!'
                });
            }
        }


        let fileName = `prod${storeId}${Date.now().toString()}`;
        const packageId = await getStorePackageId(req);

        if (!req.file) {
            fileName = "placeholder.png"
        }

        const storePackage = await Package.findOne({
            where: {
                package_id: packageId
            }
        });

        const prodCount = await Product.count({
            where: {
                store_id: storeId
            }
        });

        if (storePackage && prodCount >= storePackage.package_prod_limit) {
            return res.status(403).json({
                success: false,
                message: "คุณได้เพิ่มจำนวนสินค้าตามขีดจำกัดของแพ็คเกจแล้ว"
            });
        }

        if (prod_barcode?.trim() !== "") {
            const existingProduct = await Product.findAll({
                where: {
                    store_id: storeId,
                    prod_barcode: prod_barcode,
                }
            });

            if (existingProduct?.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "สินค้าบาร์โค้ดนี้มีอยู่แล้วค่ะ!"
                });
            }
        }

        let barcode;
        if ((auto_generate_barcode === "true" || auto_generate_barcode === true) && prod_barcode?.trim() === "") {
            barcode = Date.now().toString().substring(0, 13);
        } else {
            barcode = prod_barcode;
        }

        const newProduct = await Product.create({
            'prod_barcode': barcode,
            'prod_name': prod_name,
            'prod_cost': prod_cost,
            'prod_sale': prod_sale,
            'prod_quantity': prod_quantity,
            'prod_image': `${process.env.URL}${fileName}`,
            'store_id': parseInt(storeId),
            'cat_id': parseInt(cat_id),
            'unit_id': parseInt(unit_id),
        });

        // upload product image
        if (req.file) {
            await uploadToCloundflare(req.file.buffer, fileName);
        }
        else {
            console.log("===== This product not has image =====");
        }

        await ProductCacheClear(storeId);
        
        return res.status(201).json({
            success: true,
            message: `${prod_name} ถูกเพิ่มแล้วค่ะ!`,
            product: newProduct
        });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        })
    }
}

module.exports = AddProduct;