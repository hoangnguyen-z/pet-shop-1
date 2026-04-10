const mongoose = require('mongoose');

const index = require('./index');

const Admin = require('./admin/Admin');
const AdminRole = require('./admin/AdminRole');
const Permission = require('./admin/Permission');
const AuditLog = require('./admin/AuditLog');
const SiteSetting = require('./admin/SiteSetting');
const Article = require('./admin/Article');
const Page = require('./admin/Page');
const Brand = require('./admin/Brand');
const Attribute = require('./admin/Attribute');
const Contact = require('./admin/Contact');
const Feedback = require('./admin/Feedback');
const Report = require('./admin/Report');
const Complaint = require('./admin/Complaint');
const Refund = require('./admin/Refund');
const Return = require('./admin/Return');
const SystemLog = require('./admin/SystemLog');

module.exports = {
    Admin,
    AdminRole,
    Permission,
    AuditLog,
    SiteSetting,
    Article,
    Page,
    Brand,
    Attribute,
    Contact,
    Feedback,
    Report,
    Complaint,
    Refund,
    Return,
    SystemLog,
    ...index
};
