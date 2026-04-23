USE travel_guide_db;

INSERT INTO
    packages
VALUES (
        1,
        'Bali Paradise Escape',
        'Bali',
        1899,
        7,
        12,
        'available',
        NOW()
    ),
    (
        2,
        'Swiss Alps Adventure',
        'Switzerland',
        3200,
        10,
        5,
        'available',
        NOW()
    ),
    (
        3,
        'Tokyo Cultural Tour',
        'Japan',
        2450,
        8,
        0,
        'sold out',
        NOW()
    ),
    (
        4,
        'Santorini Getaway',
        'Greece',
        2100,
        6,
        8,
        'available',
        NOW()
    ),
    (
        5,
        'Safari Discovery',
        'Kenya',
        3750,
        12,
        3,
        'available',
        NOW()
    ),
    (
        6,
        'Maldives Luxury Stay',
        'Maldives',
        4500,
        5,
        0,
        'sold out',
        NOW()
    );

INSERT INTO
    sales
VALUES (
        1,
        1,
        'Alice Johnson',
        '2026-03-28',
        1899,
        'paid'
    ),
    (
        2,
        3,
        'Mark Chen',
        '2026-03-15',
        2450,
        'paid'
    ),
    (
        3,
        2,
        'Sarah Williams',
        '2026-02-20',
        3200,
        'paid'
    ),
    (
        4,
        1,
        'David Lee',
        '2026-02-10',
        1899,
        'pending'
    ),
    (
        5,
        5,
        'Emma Brown',
        '2026-01-25',
        3750,
        'paid'
    ),
    (
        6,
        4,
        'James Wilson',
        '2026-01-18',
        2100,
        'paid'
    ),
    (
        7,
        6,
        'Olivia Davis',
        '2025-12-30',
        4500,
        'paid'
    ),
    (
        8,
        3,
        'Liam Martinez',
        '2025-12-15',
        2450,
        'paid'
    ),
    (
        9,
        6,
        'Sophia Garcia',
        '2025-11-20',
        4500,
        'pending'
    ),
    (
        10,
        2,
        'Noah Anderson',
        '2025-11-05',
        3200,
        'paid'
    ),
    (
        11,
        4,
        'Mia Thomas',
        '2025-10-22',
        2100,
        'paid'
    ),
    (
        12,
        1,
        'Ethan Taylor',
        '2025-10-10',
        1899,
        'paid'
    );

INSERT INTO
    expenses
VALUES (
        1,
        '2026-03-25',
        'transport',
        'Airport transfers — Bali group',
        850,
        'Van rental for 12 guests',
        NOW()
    ),
    (
        2,
        '2026-03-20',
        'hotel',
        'Hotel Nusa Dua booking',
        4200,
        '7-night block booking',
        NOW()
    ),
    (
        3,
        '2026-03-15',
        'salary',
        'March guide salaries',
        6500,
        '4 guides',
        NOW()
    ),
    (
        4,
        '2026-02-28',
        'transport',
        'Swiss coach hire',
        1200,
        '10-day mountain route',
        NOW()
    ),
    (
        5,
        '2026-02-20',
        'hotel',
        'Alps Lodge reservation',
        3800,
        '10 rooms × 10 nights',
        NOW()
    );

INSERT INTO
    guides
VALUES (
        1,
        'Carlos Rivera',
        'carlos@travelguide.com',
        '+1-555-0101',
        12,
        '1,4'
    ),
    (
        2,
        'Yuki Tanaka',
        'yuki@travelguide.com',
        '+1-555-0102',
        10,
        '3,6'
    ),
    (
        3,
        'Amara Osei',
        'amara@travelguide.com',
        '+1-555-0103',
        15,
        '5'
    ),
    (
        4,
        'Lena Fischer',
        'lena@travelguide.com',
        '+1-555-0104',
        10,
        '2'
    );