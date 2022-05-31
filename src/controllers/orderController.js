const orderModel = require("../models/orderModel")
const cartModel = require("../models/cartModel")
const { isValidObjectId } = require("mongoose")

//1
const createOrder = async function (req, res) {
    try {
        let data = req.body
        let userId = req.params.userId

        // if (!isValidObjectId(data.cartId))
        // return res.status(400).send({ status: false, message: "cartId is invalid" })

        // let cart = await cartModel.findById(data.cartId)
        // if (!cart || cart.userId!==userId)
        // return res.status(404).send({ status: false, message: "CartId does not belong to the User" })

        let cartData = await cartModel.findOne({ userId }, { userId: 1, items: 1, totalPrice: 1, totalItems: 1, _id: 0 })
        if (!cartData)
            return res.status(404).send({ status: false, message: "Cart not found" })
        if (cartData.items.length == 0)
            return res.status(400).send({ status: false, message: "Cart is empty" })

        totalQuantity = cartData.items.map(x => x.quantity).reduce((a, b) => a + b)
        orderData = { ...cartData.toObject(), totalQuantity, ...data }

        let orderCreated = await orderModel.create(orderData)
        await cartModel.findOneAndUpdate(
            { userId: userId },
            { items: [], totalItems: 0, totalPrice: 0 }
        )
        return res.status(200).send({ status: true, message: "Order placed successfully", data: orderCreated })

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

//2
const updateOrder = async function (req, res) {
    try {
        let data = req.body
        let userId = req.params.userId

        if (Object.keys(data).length == 0)
            return res.status(400).send({ status: false, message: "Please provide orderId" })

        if (!isValidObjectId(data.orderId))
            return res.status(400).send({ status: false, message: "orderId is invalid" })

        let orderData = await orderModel.findOne({ _id: data.orderId, userId, isDeleted: false })
        if (!orderData)
            return res.status(404).send({ status: false, message: "Order not found" })

        if (orderData.cancellable == false)
            return res.status(200).send({ status: false, message: "Order cannot be cancelled" })

        orderData = await orderModel.findOneAndUpdate({ _id: data.orderId, userId, isDeleted: false }, { status: "cancelled" }, { new: true })

        return res.status(200).send({ status: true, message: "Order cancelled successfully", data: orderData })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

module.exports = { createOrder, updateOrder }