const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const { Conversation, ChatMessage, Shop, Product, Notification } = require('../models');
const { authenticate } = require('../middleware/auth');
const { sendSuccess, sendCreated } = require('../middleware/responseHandler');
const ApiError = require('../utils/ApiError');
const { SHOP_STATUS } = require('../config/constants');

router.use(authenticate);

function isObjectId(value) {
    return mongoose.Types.ObjectId.isValid(String(value || ''));
}

function normalizeMessage(body) {
    return String(body || '').replace(/\s+/g, ' ').trim();
}

function requireChatRole(req) {
    if (!['buyer', 'seller'].includes(req.user.role)) {
        throw ApiError.forbidden('Chỉ người mua và người bán mới được sử dụng tin nhắn');
    }
}

async function populateConversation(query) {
    return query
        .populate('buyer', 'name email phone avatar')
        .populate('seller', 'name email phone avatar')
        .populate('shop', 'name logo banner labels verificationLevel rating reviewCount')
        .populate('product', 'name thumbnail images price stock');
}

function canAccessConversation(conversation, user) {
    if (!conversation || !user) return false;
    if (user.role === 'buyer') return String(conversation.buyer?._id || conversation.buyer) === String(user.id);
    if (user.role === 'seller') return String(conversation.seller?._id || conversation.seller) === String(user.id);
    return false;
}

function getParticipantRole(conversation, user) {
    if (String(conversation.buyer?._id || conversation.buyer) === String(user.id)) return 'buyer';
    if (String(conversation.seller?._id || conversation.seller) === String(user.id)) return 'seller';
    return null;
}

async function loadAccessibleConversation(id, user) {
    if (!isObjectId(id)) {
        throw ApiError.badRequest('Mã hội thoại không hợp lệ');
    }

    const conversation = await populateConversation(Conversation.findById(id));
    if (!conversation || !canAccessConversation(conversation, user)) {
        throw ApiError.notFound('Không tìm thấy hội thoại');
    }

    return conversation;
}

async function notifyRecipient(conversation, senderRole, body) {
    const recipient = senderRole === 'buyer' ? conversation.seller : conversation.buyer;
    if (!recipient) return;

    const recipientId = recipient._id || recipient;
    const senderName = senderRole === 'buyer'
        ? (conversation.buyer?.name || 'Người mua')
        : (conversation.shop?.name || conversation.seller?.name || 'Shop');

    await Notification.create({
        user: recipientId,
        type: 'message',
        title: 'Tin nhắn mới',
        message: `${senderName}: ${body.slice(0, 120)}`,
        data: {
            conversation: conversation._id,
            shop: conversation.shop?._id || conversation.shop,
            product: conversation.product?._id || conversation.product
        },
        link: senderRole === 'buyer'
            ? `/pages/seller/messages.html?conversation=${conversation._id}`
            : `/#messages?conversation=${conversation._id}`
    });
}

router.get('/conversations', async (req, res, next) => {
    try {
        requireChatRole(req);

        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10), 1), 100);
        const skip = (page - 1) * limit;
        const filter = req.user.role === 'seller'
            ? { seller: req.user.id }
            : { buyer: req.user.id };

        const [conversations, total] = await Promise.all([
            populateConversation(Conversation.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(limit)),
            Conversation.countDocuments(filter)
        ]);

        sendSuccess(res, 'Lấy danh sách hội thoại thành công', conversations, {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
});

router.post('/conversations', async (req, res, next) => {
    try {
        requireChatRole(req);
        if (req.user.role !== 'buyer') {
            throw ApiError.forbidden('Người bán chỉ có thể trả lời trong hội thoại đã có');
        }

        const { shopId, productId, message } = req.body || {};
        let shop = null;
        let product = null;

        if (productId) {
            if (!isObjectId(productId)) throw ApiError.badRequest('Mã sản phẩm không hợp lệ');
            product = await Product.findById(productId).populate('shop');
            if (!product || !product.isActive) throw ApiError.notFound('Không tìm thấy sản phẩm');
            shop = product.shop;
        }

        if (!shop && shopId) {
            if (!isObjectId(shopId)) throw ApiError.badRequest('Mã shop không hợp lệ');
            shop = await Shop.findById(shopId);
        }

        if (!shop || shop.status !== SHOP_STATUS.APPROVED) {
            throw ApiError.notFound('Không tìm thấy shop đang hoạt động');
        }

        if (String(shop.owner) === String(req.user.id)) {
            throw ApiError.badRequest('Bạn không thể tự nhắn tin với shop của mình');
        }

        const filter = {
            buyer: req.user.id,
            seller: shop.owner,
            shop: shop._id,
            product: product?._id || null
        };

        let conversation = await Conversation.findOne(filter);
        if (!conversation) {
            try {
                conversation = await Conversation.create(filter);
            } catch (error) {
                if (error.code === 11000) {
                    conversation = await Conversation.findOne(filter);
                } else {
                    throw error;
                }
            }
        }

        const cleanMessage = normalizeMessage(message);
        if (cleanMessage) {
            const createdMessage = await ChatMessage.create({
                conversation: conversation._id,
                sender: req.user.id,
                senderRole: 'buyer',
                body: cleanMessage
            });

            conversation.lastMessage = cleanMessage;
            conversation.lastMessageAt = createdMessage.createdAt;
            conversation.lastSender = req.user.id;
            conversation.sellerUnreadCount += 1;
            await conversation.save();
        }

        const populated = await populateConversation(Conversation.findById(conversation._id));
        if (cleanMessage) {
            await notifyRecipient(populated, 'buyer', cleanMessage);
        }

        sendCreated(res, 'Mở hội thoại thành công', populated);
    } catch (error) {
        next(error);
    }
});

router.get('/conversations/:id/messages', async (req, res, next) => {
    try {
        requireChatRole(req);
        const conversation = await loadAccessibleConversation(req.params.id, req.user);
        const messages = await ChatMessage.find({ conversation: conversation._id })
            .populate('sender', 'name avatar role')
            .sort({ createdAt: 1 })
            .limit(300);

        sendSuccess(res, 'Lấy tin nhắn thành công', {
            conversation,
            messages
        });
    } catch (error) {
        next(error);
    }
});

router.post('/conversations/:id/messages', async (req, res, next) => {
    try {
        requireChatRole(req);
        const conversation = await loadAccessibleConversation(req.params.id, req.user);
        const senderRole = getParticipantRole(conversation, req.user);
        if (!senderRole) throw ApiError.forbidden('Bạn không thuộc hội thoại này');

        const body = normalizeMessage(req.body?.body);
        if (!body) throw ApiError.badRequest('Vui lòng nhập nội dung tin nhắn');
        if (body.length > 2000) throw ApiError.badRequest('Tin nhắn không được vượt quá 2000 ký tự');

        const message = await ChatMessage.create({
            conversation: conversation._id,
            sender: req.user.id,
            senderRole,
            body
        });

        conversation.lastMessage = body;
        conversation.lastMessageAt = message.createdAt;
        conversation.lastSender = req.user.id;
        if (senderRole === 'buyer') {
            conversation.sellerUnreadCount += 1;
        } else {
            conversation.buyerUnreadCount += 1;
        }
        await conversation.save();

        const populated = await populateConversation(Conversation.findById(conversation._id));
        await notifyRecipient(populated, senderRole, body);
        await message.populate('sender', 'name avatar role');

        sendCreated(res, 'Gửi tin nhắn thành công', message);
    } catch (error) {
        next(error);
    }
});

router.patch('/conversations/:id/read', async (req, res, next) => {
    try {
        requireChatRole(req);
        const conversation = await loadAccessibleConversation(req.params.id, req.user);
        const participantRole = getParticipantRole(conversation, req.user);
        if (!participantRole) throw ApiError.forbidden('Bạn không thuộc hội thoại này');

        if (participantRole === 'buyer') {
            conversation.buyerUnreadCount = 0;
        } else {
            conversation.sellerUnreadCount = 0;
        }
        await conversation.save();

        await ChatMessage.updateMany({
            conversation: conversation._id,
            sender: { $ne: req.user.id },
            readAt: null
        }, {
            $set: { readAt: new Date() }
        });

        sendSuccess(res, 'Đã đánh dấu hội thoại là đã đọc', conversation);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
