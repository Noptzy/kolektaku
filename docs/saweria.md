CREATE PAYMENT
POST https://backend.saweria.co/donations/snap/b9144a90-0720-453e-8595-d05a71efba9c


payload :

{
    "agree": true,
    "notUnderage": true,
    "message": "dasdas",
    "amount": 12000,
    "payment_type": "qris",
    "vote": "",
    "currency": "IDR",
    "customer_info": {
        "first_name": "asdas",
        "email": "asdasd@gmail.com",
        "phone": ""
    }
}

response :
{
    "data": {
        "amount": 12085,
        "amount_raw": 12085,
        "created_at": "Tue, 24 Mar 2026 05:14:36 GMT",
        "currency": "IDR",
        "donator": {
            "email": "asdasd@gmail.com",
            "first_name": "asdas",
            "phone": null
        },
        "donator_id": null,
        "etc": {
            "amount_to_display": 12000,
            "transaction_fee_policy": "TIPPER"
        },
        "id": "3449bf42-f2b2-48c4-ae53-df8428ae0ae6",
        "message": "dasdas",
        "need_notification": true,
        "payment_type": "qris",
        "qr_string": "00020101021226650013CO.XENDIT.WWW01189360084800000000020215WNtXtb6qmr4ZJBw0303UME51370014ID.CO.QRIS.WWW0215ID20253781998505204509953033605405120855802ID5922PT Harta Tahta Sukaria6013JAKARTA PUSAT61051034062290525oSwCuJpMeuQ4rLtoSwLjPrHXH630472A4",
        "status": "PENDING",
        "type": "donation",
        "user_id": "b9144a90-0720-453e-8595-d05a71efba9c"
    }
}


Check Payment
GET https://backend.saweria.co/donations/qris/snap/3449bf42-f2b2-48c4-ae53-df8428ae0ae6

{
    "data": {
        "amount_raw": 12085,
        "created_at": "Tue, 24 Mar 2026 05:14:36 GMT",
        "id": "3449bf42-f2b2-48c4-ae53-df8428ae0ae6",
        "qr_string": "00020101021226650013CO.XENDIT.WWW01189360084800000000020215WNtXtb6qmr4ZJBw0303UME51370014ID.CO.QRIS.WWW0215ID20253781998505204509953033605405120855802ID5922PT Harta Tahta Sukaria6013JAKARTA PUSAT61051034062290525oSwCuJpMeuQ4rLtoSwLjPrHXH630472A4",
        "transaction_status": "Pending",
        "username": "noptzy"
    }
}