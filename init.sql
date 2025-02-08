CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_password VARCHAR(255) NOT NULL,
    user_birthday DATE NOT NULL,
    token_last_used_at TIMESTAMP,
    token_expires_at TIMESTAMP,
    token VARCHAR(255)
);

ALTER TABLE users
ADD COLUMN email_verification_code VARCHAR(255) NULL,
ADD COLUMN verification_code_expires_at TIMESTAMP NULL;

ALTER TABLE users
ADD COLUMN email_verified_at TIMESTAMP NULL;

ALTER TABLE users
ADD COLUMN login_attempts INT DEFAULT 0,
ADD COLUMN last_login_attempt_at TIMESTAMP NULL,
ADD COLUMN reset_attempts_token VARCHAR(255) NULL,
ADD COLUMN reset_attempts_token_expires_at TIMESTAMP NULL;

ALTER TABLE users
ADD COLUMN verification_attempts INT DEFAULT 0,
ADD COLUMN last_verification_attempt_at TIMESTAMP NULL,
ADD COLUMN reset_verification_attempts_token VARCHAR(255) NULL,
ADD COLUMN reset_verification_attempts_token_expires_at TIMESTAMP NULL;

ALTER TABLE users
ADD COLUMN role VARCHAR(255);

--
--
--
CREATE TABLE crypto (
    id SERIAL PRIMARY KEY,
    label VARCHAR(255) NOT NULL    
);

--
--
--
CREATE TABLE crypto_cours (
    id SERIAL PRIMARY KEY,
    id_crypto INT NOT NULL REFERENCES crypto(id),
    cours DECIMAL(10, 2) NOT NULL,
    date_cours TIMESTAMP NOT NULL  
);

--
--
--
CREATE TABLE crypto_transactions (
    id SERIAL PRIMARY KEY,
    id_user INT NOT NULL REFERENCES users(id),
    id_crypto INT NOT NULL REFERENCES crypto(id),
    is_sale BOOLEAN NOT NULL,
    is_purchase BOOLEAN NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    date_transaction TIMESTAMP NOT NULL  
);

--
--
--
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    id_user INT NOT NULL REFERENCES users(id),
    deposit DECIMAL(10, 2) NOT NULL,
    withdrawal DECIMAL(10, 2) NOT NULL,
    date_transaction TIMESTAMP NOT NULL  
);

ALTER TABLE transactions
ADD COLUMN validation_token VARCHAR(255),
ADD COLUMN validation_token_expires_at TIMESTAMP,
ADD COLUMN validated_at TIMESTAMP,
ADD COLUMN is_validated BOOLEAN DEFAULT FALSE;

--
--
--

CREATE OR REPLACE FUNCTION f_insert_into_transactions()
RETURNS TRIGGER AS $$
DECLARE
    crypto_price DECIMAL(10, 2);
BEGIN
    SELECT cours
    INTO crypto_price
    FROM crypto_cours
    WHERE id_crypto = NEW.id_crypto
      AND date_cours <= NEW.date_transaction
    ORDER BY date_cours DESC
    LIMIT 1;

    IF crypto_price IS NULL THEN
        RAISE EXCEPTION 'No crypto price found for id_crypto=% and date_transaction=%', NEW.id_crypto, NEW.date_transaction;
    END IF;

    INSERT INTO transactions (id_user, deposit, withdrawal, date_transaction)
    VALUES (
        NEW.id_user, 
        CASE WHEN NEW.is_sale THEN NEW.quantity * crypto_price ELSE 0 END,     
        CASE WHEN NEW.is_purchase THEN NEW.quantity * crypto_price ELSE 0 END, 
        NEW.date_transaction
    );

    RETURN NEW;
END;
$$
LANGUAGE plpgsql;


--
--
--
CREATE OR REPLACE TRIGGER t_after_crypto_transaction_insert
AFTER INSERT ON crypto_transactions
FOR EACH ROW
EXECUTE FUNCTION f_insert_into_transactions();


--
--
--
INSERT INTO crypto (id, label) VALUES (1, 'Bitcoin');
INSERT INTO crypto (id, label) VALUES (2, 'Ethereum');
INSERT INTO crypto (id, label) VALUES (3, 'Ripple');
INSERT INTO crypto (id, label) VALUES (4, 'Litecoin');
INSERT INTO crypto (id, label) VALUES (5, 'Cardano');
INSERT INTO crypto (id, label) VALUES (6, 'Polkadot');
INSERT INTO crypto (id, label) VALUES (7, 'Chainlink');
INSERT INTO crypto (id, label) VALUES (8, 'Bitcoin Cash');
INSERT INTO crypto (id, label) VALUES (9, 'Stellar');
INSERT INTO crypto (id, label) VALUES (10, 'Dogecoin');

--
--
--
CREATE OR REPLACE VIEW v_user_current_solde AS
SELECT
    u.id AS user_id,
    u.user_name AS user_name,
    COALESCE(SUM(t.deposit), 0) - COALESCE(SUM(t.withdrawal), 0) AS current_solde
FROM
    users u
LEFT JOIN
    transactions t ON u.id = t.id_user
GROUP BY
    u.id, u.user_name;

--
--
--
CREATE OR REPLACE VIEW v_user_crypto_holdings AS
SELECT
    u.id AS user_id,
    u.user_name AS user_name,
    c.label AS crypto_label,
    COALESCE(SUM(
        CASE
            WHEN ct.is_purchase THEN ct.quantity
            WHEN ct.is_sale THEN -ct.quantity
            ELSE 0
        END
    ), 0) AS current_quantity
FROM
    users u
LEFT JOIN
    crypto_transactions ct ON u.id = ct.id_user
LEFT JOIN
    crypto c ON ct.id_crypto = c.id
GROUP BY
    u.id, u.user_name, c.label
ORDER BY
    u.id, c.label;

--
-- 
--
CREATE TABLE admin_credentials (
    id SERIAL PRIMARY KEY,
    admin_email VARCHAR(255) NOT NULL,
    admin_password VARCHAR(255) NOT NULL,
    token VARCHAR(255),
    token_expires_at TIMESTAMP,
    token_last_used_at TIMESTAMP
);

--
--
--
CREATE OR REPLACE view v_user_crypto_summary AS
SELECT
    u.id AS user_id,
    u.user_name AS user_name,
    COALESCE(SUM(
        CASE
            WHEN ct.is_purchase THEN ct.quantity * closest_cours.cours
            ELSE 0
        END
    ), 0) AS total_achat,
    COALESCE(SUM(
        CASE
            WHEN ct.is_sale THEN ct.quantity * closest_cours.cours
            ELSE 0
        END
    ), 0) AS total_vente,
    COALESCE(SUM(
        CASE
            WHEN ct.is_purchase THEN ct.quantity * closest_cours.cours
            WHEN ct.is_sale THEN -ct.quantity * closest_cours.cours
            ELSE 0
        END
    ), 0) AS total_amount,
    COALESCE(SUM(
        CASE
            WHEN ct.is_purchase THEN ct.quantity
            WHEN ct.is_sale THEN -ct.quantity
            ELSE 0
        END
    ), 0) AS total_crypto_quantity,
    COALESCE(SUM(
        CASE
            WHEN ct.is_purchase THEN ct.quantity * closest_cours.cours
            WHEN ct.is_sale THEN -ct.quantity * closest_cours.cours
            ELSE 0
        END
    ), 0) AS total_crypto_value,
    MIN(ct.date_transaction) AS datetime_min,
    MAX(ct.date_transaction) AS datetime_max
FROM
    users u
LEFT JOIN
    crypto_transactions ct ON u.id = ct.id_user
LEFT JOIN LATERAL (
    SELECT ccl.cours
    FROM crypto_cours ccl
    WHERE ccl.id_crypto = ct.id_crypto AND ccl.date_cours <= ct.date_transaction
    ORDER BY ccl.date_cours DESC
    LIMIT 1
) closest_cours ON TRUE
GROUP BY
    u.id, u.user_name
ORDER BY
    u.id;

--
--
--
CREATE TABLE commission (
    id SERIAL PRIMARY KEY,
    percentage_sell DECIMAL(10, 2) NOT NULL,
    percentage_buy DECIMAL(10, 2) NOT NULL,
    date_reference DATE NOT NULL
);

INSERT INTO commission (id, percentage_sell, percentage_buy, date_reference)
VALUES (1, 5, 6, '2025-01-30');

--
--
--
CREATE VIEW v_crypto_transaction_commission AS
SELECT 
    ct.id AS transaction_id,
    ct.id_user,
    u.user_name AS user_name,
    ct.id_crypto,
    cr.label AS crypto_label,
    ct.is_sale,
    ct.is_purchase,
    ct.quantity,
    ct.date_transaction,
    cc.cours AS crypto_price,
    c.percentage_sell,
    c.percentage_buy,
    CASE 
        WHEN ct.is_sale THEN (ct.quantity * cc.cours * c.percentage_sell / 100)
        WHEN ct.is_purchase THEN (ct.quantity * cc.cours * c.percentage_buy / 100)
        ELSE 0
    END AS commission_amount
FROM 
    crypto_transactions ct
CROSS JOIN 
    (SELECT * FROM commission ORDER BY date_reference DESC LIMIT 1) c
JOIN 
    crypto_cours cc 
ON 
    cc.id_crypto = ct.id_crypto
    AND cc.date_cours = (
        SELECT MAX(date_cours) 
        FROM crypto_cours 
        WHERE id_crypto = ct.id_crypto 
        AND date_cours <= ct.date_transaction
    )
JOIN users u 
ON ct.id_user = u.id
JOIN crypto cr 
ON ct.id_crypto = cr.id;


create table favori (
    id SERIAL PRIMARY KEY,
    id_user INT NOT NULL REFERENCES users(id),
    id_crypto INT NOT NULL REFERENCES crypto(id)
);