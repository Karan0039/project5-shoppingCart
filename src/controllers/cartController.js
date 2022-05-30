const cartModel = require("../models/cartModel")
const productModel = require("../models/productModel")
const userModel = require("../models/userModel")
const { isValidObjectId } = require("mongoose")

const isValid = (value) => {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true;
}

//1
const createCart = async function (req, res) {
    try {
        let userId = req.params.userId
        const { productId, cartId, quantity } = req.body
        if (Object.keys(req.body).length == 0)
            return res.status(400).send({ status: false, message: "Field cannot be empty. Please enter some details" });

        if (!isValidObjectId(productId))
            return res.status(400).send({ status: false, message: "productId is invalid" });

        if (!isValidObjectId(cartId))
            return res.status(400).send({ status: false, message: "CART ID is Not Valid" });

        const findUserDetails = await userModel.findOne({ _id: userId })
        if (!findUserDetails)
            return res.status(404).send({ status: false, message: "User not found" });

        const findProductDetails = await productModel.findOne({ _id: productId, isDeleted: false }).select({ _id: 0, price: 1 })
        let price = findProductDetails.price
        if (!findProductDetails)
            return res.status(404).send({ status: false, message: "Product not found" });

        let findCart
        if (quantity == 0)
            return res.status(400).send({ message: "Quantity should not be zer0" })

        findCart = await cartModel.findOne({ _id: cartId, userId })
        let product = {
            productId: productId,
            quantity: quantity
        }
        if (findCart) {
            let indexOfProduct = -1
            for (let i in findCart.items) {
                if (findCart.items[i].productId == productId) {
                    indexOfProduct = i
                    break
                }
            }
            if (indexOfProduct == -1)
                findCart = await cartModel.findOneAndUpdate({ userId }, { $addToSet: { items: product }, $inc: { totalPrice: price * quantity, totalItems: quantity } }, { new: true })

            else {
                findCart.items[indexOfProduct].quantity += quantity
                findCart.totalItems += quantity
                findCart.totalPrice += price * quantity
                await findCart.save();
            }
        }
        let data = {
            userId: userId,
            items: [{
                productId: productId,
                quantity: quantity
            }],
            totalPrice: price * quantity,
            totalItems: quantity
        }
        if (!findCart) {
            let createdCart = await cartModel.create(data)
            return res.status(201).send({ status: true, msg: "New cart created", data: createdCart })
        }
        else {
            return res.status(200).send({ status: true, msg: "Items added to cart", data: findCart })
        }
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }

}


//2
const updateCart = async function (req, res) {
    try {
        let data = req.body
        let error = []
        if (Object.keys(data).length == 0)
            return res.status(404).send({ status: false, message: "Please enter data to update cart details" })

        if (!isValidObjectId(data.cartId))
            error.push("invalid cartId")
        if (!isValidObjectId(data.productId))
            error.push("invalid productId")
        if (!isValid(data.removeProduct))
            error.push("removeProduct is required")
        if (data.removeProduct && !(data.removeProduct == 0 || data.removeProduct == 1))
            error.push("removeProduct accepts either 0 or 1")

        if (error.length > 0)
            return res.status(400).send({ status: false, message: error })

        let cart = await cartModel.findOne({ _id: data.cartId, userId: req.params.userId, isDeleted: false })
        if (!cart)
            return res.status(404).send({ status: false, message: "Cart not found" })

        let indexOfProduct = -1
        for (let i in cart.items) {
            if (cart.items[i].productId == data.productId) {
                indexOfProduct = i
                break
            }
        }
        if (indexOfProduct == -1)
            return res.status(404).send({ status: false, message: "Product not found inside cart" })

        let quantity = cart.items[indexOfProduct].quantity

        let product = await productModel.findOne({ _id: data.productId, isDeleted: false })
        if (!product)
            return res.status(404).send({ status: false, message: "Product not found" })

        if (cart.items[indexOfProduct].quantity == 1 && data.removeProduct == 1)
            data.removeProduct = 0

        switch (data.removeProduct) {
            case 0:
                cart.totalItems -= cart.items[indexOfProduct].quantity
                cart.items = cart.items.filter(function (value, index) { if (index != indexOfProduct) return value })
                cart.totalPrice -= product.price * quantity
                break;
            case 1:
                --cart.items[indexOfProduct].quantity
                --cart.totalItems
                cart.totalPrice -= product.price
                break;
        }
        await cart.save();
        return res.status(200).send({ status: true, message: "Updated cart details", data: cart })

    } catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}


//3
const getCart = async function (req, res) {
    try {
        let cart = await cartModel.find({ userId: req.params.userId, isDeleted: false })
        if (!cart)
            return res.status(404).send({ status: false, message: "Cart not found." })

        return res.status(200).send({ status: true, message: "Cart details", data: cart })

    } catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}


//4
const deleteCart = async function (req, res) {
    try {
        let cart = await cartModel.findOneAndUpdate({ _id: req.body.cartId, userId: req.params.userId }, { items: [], totalItems: 0, totalPrice: 0 })
        if (!cart)
            return res.status(404).send({ status: false, message: "Cart not found." })

        return res.status(200).send({ status: true, message: "Cart deleted successfully" })

    } catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}

module.exports = { createCart, updateCart, getCart, deleteCart }