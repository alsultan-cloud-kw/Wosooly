from sqlalchemy.orm import Session
from models import *
from typing import List, Dict
from sqlalchemy import func, extract, cast, Date, desc, text, distinct
from datetime import date, timedelta, datetime
from collections import Counter

def get_latest_orders_data(db: Session, client_id: int) -> List[dict]:
    orders = (
        db.query(Order)
        .join(Customer, Order.customer_id == Customer.id)
        .filter(Customer.client_id == client_id)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )

    return [
        {
            "id": f"#OD{order.id}",
            "user": f"{order.customer.first_name} {order.customer.last_name}" if order.customer else "Unknown",
            "date": order.created_at.strftime("%d %b %Y"),
            "price": f"${order.total_amount:.2f}",
            "status": order.status,
        }
        for order in orders
    ]

def get_total_orders_count_data(db: Session, client_id: int) -> List[dict]:
    """
    Count all orders belonging to a specific client using ORM relationships.
    """
    # Count orders where customer's client_id matches
    total_orders = (
        db.query(Order)
        .join(Order.customer)          # Use the relationship
        .filter(Customer.client_id == client_id)
        .count()
    )

    return [
        {
            "title": "Total Orders",
            "count": total_orders
        }
    ]

def get_total_sales_data(db: Session, client_id: int) -> List[dict]:
    total_sales = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0.0))
        .join(Customer, Order.customer_id == Customer.id)
        .filter(Customer.client_id == client_id)
        .filter(Order.status.in_(["completed"]))  # Include both statuses
        .scalar()
    )

    return [
        {
            "titlesales": "Total Sales",
            "totalamount": round(total_sales, 2)  # Rounded to 2 decimal places
        }
    ]

def get_average_order_value_data(db: Session, client_id: int) -> List[dict]:
    result = (
        db.query(
            func.coalesce(func.sum(Order.total_amount), 0.0).label("total_sales"),
            func.count(Order.id).label("completed_order_count")
        )
        .filter(Order.customer.has(client_id=client_id))
        .filter(Order.status == "completed")
        .first()
    )

    total_sales = result.total_sales
    completed_order_count = result.completed_order_count

    aov = total_sales / completed_order_count if completed_order_count > 0 else 0.0

    return [{"title": "Average Order Value", "amount": round(aov, 2)}]
    
def get_total_customers_count_data(db: Session, client_id: int) -> List[dict]:
    total_customers = (
        db.query(func.count(Customer.id))
        .filter(Customer.client_id == client_id)
        .scalar()
    )

    return [
        {
            "titlecustomers": "Total Customers",
            "countcustomers": total_customers
        }
    ]

def get_top_customers_data(db: Session, client_id: int) -> List[dict]:
    results = (
        db.query(
            Customer.first_name,
            Customer.last_name,
            func.count(Order.id).label("total_orders"),
            func.coalesce(func.sum(Order.total_amount), 0).label("total_spending")
        )
        .join(Order, Order.customer_id == Customer.id)
        .filter(Customer.client_id == client_id)
        .filter(Order.status == "completed")
        .group_by(Customer.id)
        .order_by(desc("total_spending"))
        .limit(5)
        .all()
    )

    return [
        {
            "user": f"{row.first_name} {row.last_name}",
            "total_orders": row.total_orders,
            "total_spending": round(row.total_spending, 2)
        }
        for row in results
    ]

def get_sales_comparison_data(db: Session, client_id: int) -> dict:
    today = date.today()
    current_month = today.month
    current_year = today.year

    # Previous month calculation
    first_day_current = date(current_year, current_month, 1)
    last_day_prev = first_day_current - timedelta(days=1)
    prev_month = last_day_prev.month
    prev_year = last_day_prev.year

    # Current month sales per day for this client
    current_month_query = text("""
        SELECT EXTRACT(DAY FROM o.created_at) AS day, SUM(o.total_amount) AS total
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE 
            c.client_id = :client_id AND
            EXTRACT(MONTH FROM o.created_at) = :month AND
            EXTRACT(YEAR FROM o.created_at) = :year AND
            o.created_at <= :today AND
            o.status NOT IN ('failed', 'cancelled')
        GROUP BY day
        ORDER BY day
    """)
    current_sales = db.execute(current_month_query, {
        "client_id": client_id,
        "month": current_month,
        "year": current_year,
        "today": today
    }).fetchall()

    # Previous month sales per day for this client
    prev_month_query = text("""
        SELECT EXTRACT(DAY FROM o.created_at) AS day, SUM(o.total_amount) AS total
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE 
            c.client_id = :client_id AND
            EXTRACT(MONTH FROM o.created_at) = :month AND
            EXTRACT(YEAR FROM o.created_at) = :year AND
            o.status NOT IN ('failed', 'cancelled')
        GROUP BY day
        ORDER BY day
    """)
    prev_sales = db.execute(prev_month_query, {
        "client_id": client_id,
        "month": prev_month,
        "year": prev_year
    }).fetchall()

    return {
        "currentMonth": [{"day": int(row.day), "total": float(row.total)} for row in current_sales],
        "previousMonth": [{"day": int(row.day), "total": float(row.total)} for row in prev_sales]
    }

def get_orders_in_range_data(db: Session, start_date: str, end_date: str, granularity: str = "daily", client_id: int = None):
    """
    Get total order amount grouped by date/month/year for a specific client.
    """
    if not client_id:
        return []  # Safety

    base_query = (
        db.query(Order)
        .join(Customer, Customer.id == Order.customer_id)
        .filter(
            Customer.client_id == client_id,
            Order.created_at >= start_date,
            Order.created_at <= end_date,
            Order.status.in_(["completed", "wc-completed"])
        )
    )

    # 👇 Grouping logic by granularity
    if granularity == "daily":
        query = (
            base_query.with_entities(
                func.date(Order.created_at).label("date"),
                func.sum(Order.total_amount).label("total_amount"),
                func.count(Order.id).label("order_count"),
            )
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
        )

    elif granularity == "monthly":
        query = (
            base_query.with_entities(
                func.to_char(Order.created_at, "YYYY-MM").label("date"),
                func.sum(Order.total_amount).label("total_amount"),
                func.count(Order.id).label("order_count"),
            )
            .group_by(func.to_char(Order.created_at, "YYYY-MM"))
            .order_by(func.to_char(Order.created_at, "YYYY-MM"))
        )

    elif granularity == "yearly":
        query = (
            base_query.with_entities(
                func.to_char(Order.created_at, "YYYY").label("date"),
                func.sum(Order.total_amount).label("total_amount"),
                func.count(Order.id).label("order_count"),
            )
            .group_by(func.to_char(Order.created_at, "YYYY"))
            .order_by(func.to_char(Order.created_at, "YYYY"))
        )

    else:
        raise ValueError("Invalid granularity. Use 'daily', 'monthly', or 'yearly'.")

    results = query.all()

    return [
        {
            "date": str(row.date),
            "total_amount": round(float(row.total_amount or 0), 3),
            "order_count": int(row.order_count or 0),
        }
        for row in results
    ]

def get_orders_data(db: Session, client_id: int) -> List[dict]:
    """
    Fetch all orders for a specific client.
    Joins Order → Customer and filters by client_id.
    """
    orders = (
        db.query(Order)
        .join(Order.customer)  # ✅ Join to the Customer table
        .filter(Customer.client_id == client_id)  # ✅ Only this client's orders
        .order_by(Order.created_at.desc())
        .all()
    )

    return [
        {
            "id": f"#OD{order.id}",
            "user": (
                f"{order.customer.first_name} {order.customer.last_name}"
                if order.customer else "Unknown"
            ),
            "date": order.created_at.strftime("%d %b %Y"),
            "Amount": f"KD:{order.total_amount:.2f}",
            "status": order.status,
            "attribution_referrer": order.attribution_referrer,
        }
        for order in orders
    ]

def get_attribution_summary(db: Session, client_id: int) -> List[dict]:
    """
    Fetch attribution summary for a specific client.
    Joins Orders → Customers to filter by client.
    """
    results = (
        db.query(Order.attribution_referrer, func.count(Order.id))
        .join(Order.customer)  # ✅ Join Orders to Customers
        .filter(Customer.client_id == client_id)  # ✅ Filter by client's ID
        .group_by(Order.attribution_referrer)
        .all()
    )

    summary = [
        {
            "referrer": referrer if referrer else "Unknown",
            "count": count
        }
        for referrer, count in results
    ]

    return summary

def get_orders_by_location_data(db: Session) -> List[dict]:

    # Step 1: Query city-level order counts (only from Kuwait)
    clean_city = func.lower(func.trim(Address.city))

    results = (
        db.query(
            clean_city.label("city"),
            func.count(func.distinct(Order.id)).label("order_count")
        )
        .join(Customer, Customer.id == Address.customer_id)
        .join(Order, Order.customer_id == Customer.id)
        .filter(Address.country.ilike("KW"))
        .group_by(clean_city)  # << important
        .all()
    )

    print(f"Raw city-level order counts: {results}")

    # orders_with_city = (
    #     db.query(Order.id, Address.city)
    #     .join(Customer, Customer.id == Order.customer_id)
    #     .join(Address, Address.customer_id == Customer.id)
    #     .filter(Address.country.ilike("KW"))
    #     .distinct(Order.id)  # ensures one city per order
    #     .all()
    # )

    # for order_id, city in orders_with_city:
    #     print(order_id, city)

    # def analyze_orders(orders_with_city):
    #     # Extract cities from the query results
    #     cities = [city for _, city in orders_with_city]

    #     # Count how many orders each city has
    #     city_order_counts = Counter(cities)

    #     # Print a table of distinct cities and their order counts
    #     print(f"{'City':<25} | {'Number of Orders':>15}")
    #     print("-" * 43)
    #     for city, count in city_order_counts.most_common():
    #         print(f"{city:<25} | {count:>15}")

    #     return city_order_counts

    # # Usage
    # city_counts = analyze_orders(orders_with_city)

    # Step 2: City name normalization map (partial view for clarity)
    CITY_NAME_MAP = {
        "كبد": "Kabad", "القصور": "Al Qusour", "al-qosour": "Al Qusour",
        "مزارع الوفرة": "Wafra Farms", "جواخيرالوفرة": "Wafra Farms",
        "صباح السالم": "Sabah Al Salem", "sabah al-salem": "Sabah Al Salem",
        "مبارك الكبير": "Mubarak Al Kabeer", "العدان": "Al Adan",
        "العبدلي": "Al Abdali", "al-abdilee": "Al Abdali",
        "الرميثية": "Rumaithiya", "al-rumaithiya": "Rumaithiya",
        "القرين": "Al Qurain", "مدينة الأحمدي": "Ahmadi City",
        "سلوى": "Salwa", "salwa": "Salwa",
        "مدينة صباح الأحمد": "Sabah Al Ahmad City", "الرقة": "Al Riqqa",
        "السالمية": "Salmiya", "مدينة سعد العبدالله": "Saad Al Abdullah City",
        "الصباحية": "Sabahiya", "ضاحية عبدالله المبارك": "Abdullah Al Mubarak",
        "abdulla al-mubarak": "Abdullah Al Mubarak", "حطين": "Hateen",
        "جابر العلي": "Jaber Al Ali", "جابر الأحمد": "Jaber Al Ahmad",
        "al-sulaibia traditional accommodations": "Sulaibiya", "الري": "Al Rai",
        "الجهراء": "Jahra", "الاندلس": "Andalus", "الدوحة": "Doha",
        "al-doha": "Doha", "مشرف": "Mishref", "أبو فطيرة": "Abu Fatira",
        "abu fatera": "Abu Fatira", "الفروانية": "Farwaniya",
        "al-farwaniya": "Farwaniya", "الدسمة": "Dasma", "الزهراء": "Zahra",
        "المنقف": "Mangaf", "الفردوس": "Firdous",
        "علي صباح السالم (ام الهيمان)": "Ali Sabah Al Salem",
        "علي صباح السالم   (ام الهيمان)": "Ali Sabah Al Salem",
        "بيان": "Bayan", "الروضة": "Rawda",
        "ضاحية عبدالله السالم": "Abdullah Al Salem", "هدية": "Hadiya",
        "حولي": "Hawally", "الظهر": "Dhaher",
        "مدينة الخيران الجديدة": "New Khairan City",
        "al-kheeran and al-kheeran pearl": "New Khairan City",
        "فهد الأحمد": "Fahad Al Ahmad", "الجابرية": "Jabriya",
        "al-jabriya": "Jabriya", "السرة": "Surra", "القصر": "Al Qasr",
        "سباق الهجن وسباق الفروسية": "Camel & Horse Racing", "العارضية": "Ardiya",
        "الصليبخات": "Sulaibikhat", "اليرموك": "Yarmouk",
        "جنوب الدوحة  - القيروان": "South Doha - Qairawan",
        "الشامية": "Shamiya", "الصليبية الزراعية 1": "Sulaibiya Agriculture",
        "العديلية": "Adailiya", "النهضة - شرق الصليبخات": "Nahda - East Sulaibikhat",
        "الفحيحيل": "Fahaheel", "الشهداء": "Shuhada", "الفنيطيس": "Fnaitees",
        "الرحاب": "Rehab", "الرابية": "Rabiya", "قرطبة": "Qurtuba",
        "السلام": "Salam", "abdulla port and industrial shuaiba": "Shuaiba Industrial",
        "north of al-shuaiba -al-ahmadi port": "North Shuaiba",
        "المنصورية": "Mansouriya", "النزهة": "Nuzha", "أشبيلية": "Ishbiliya",
        "بر محافظة الأحمدي": "Ahmadi Desert", "المهبولة": "Mahboula",
        "جليب الشيوخ": "Jleeb Al Shuyoukh", "كيفان": "Keifan",
        "الفنطاس": "Fintas", "الصديق": "Siddiq", "العقيلة": "Eqaila",
        "النسيم": "Naseem", "صبحان الصناعية": "Sabhan Industrial",
        "الواحة": "Waha", "خيطان": "Khaitan", "تيماء": "Tayma",
        "القادسية": "Qadsiya",
    }

    # Step 3: Coordinates for major cities (you can extend this)
    city_coords = {
    "Hawalli": [48.02861, 29.33278],
    "Salmiya": [48.08333, 29.33333],
    "Farwaniya": [47.95861, 29.27750],
    "Mahboula": [48.13028, 29.14500],
    "Sabah Al Salem": [48.05722, 29.25722],
    "Mangaf": [48.13278, 29.09611],
    "Bayan": [48.04881, 29.30320],
    "Wafra Farms": [47.93056, 28.63917],
    "Abdullah Al Salem": [47.97806, 29.26917],
    "Mubarak Al Kabeer": [47.65806, 29.33750],
    "Fintas": [48.12111, 29.17389],
    "Doha": [47.93306, 29.29500],
    "Dasma": [48.00139, 29.36500],
    "Shuwaikh Commercial": [47.95000, 29.35000],
    "Jahra": [47.65806, 29.33750],
    "Fahaheel": [48.12361, 29.09889],
    "Sabhan Industrial": [47.90000, 29.25000],
    "Jaber Al Ahmad": [47.90000, 29.30000],
    "Jleeb Al Shuyoukh": [47.90000, 29.25000],
    "Kaifan": [47.95000, 29.30000],
    "Mishref": [47.95000, 29.30000],
    "Qurtuba": [47.95000, 29.30000],
    "Fahad Al Ahmad": [47.95000, 29.30000],
    "Abdullah Al Mubarak": [47.95000, 29.30000],
    "Umm Al Haiman": [47.95000, 29.30000],
    "Kabed": [47.95000, 29.30000],
    "Hateen": [47.95000, 29.30000],
    "Nuzha": [47.95000, 29.30000],
    "Sulaibikhat": [47.95000, 29.30000],
    "Siddiq": [47.95000, 29.30000],
    "Sabahiya": [47.95000, 29.30000],
    "Dasman": [47.95000, 29.30000],
    "Surra": [47.95000, 29.30000],
    "Rai": [47.95000, 29.30000],
    "Rawda": [47.95000, 29.30000],
    "Riqqa": [47.95000, 29.30000],
    "Shamiya": [47.95000, 29.30000],
    "Shuhada": [47.95000, 29.30000],
    "Al Nahda": [47.95000, 29.30000],
    "Zahraa": [47.95000, 29.30000],
    "Qusoor": [47.95000, 29.30000],
    "Qasr": [47.95000, 29.30000],
    "Eqaila": [47.95000, 29.30000],
    "Ardiya": [47.95000, 29.30000],
    "Adailiya": [47.95000, 29.30000],
    "Adan": [47.95000, 29.30000],
    "Omariya": [47.95000, 29.30000],
    "Oyoun": [47.95000, 29.30000],
    "Naseem": [47.95000, 29.30000],
    "Naeem": [47.95000, 29.30000],
    "Nuwaiseeb": [47.95000, 29.30000],
    "Waha": [47.95000, 29.30000],
    "Ferdous": [47.95000, 29.30000],
    "Rumaithiya": [47.95000, 29.30000],
    "Reqaee": [47.95000, 29.30000],
    "Qurain": [47.95000, 29.30000],
    "Faiha": [47.95000, 29.30000],
    "Fnaitees": [47.95000, 29.30000],
    "Bneid Al Gar": [47.95000, 29.30000],
    "Ishbiliya": [47.95000, 29.30000],
    "Andalus": [47.95000, 29.30000],
    "Jabriya": [47.95000, 29.30000],
    "Jaber Al Ali": [47.95000, 29.30000],
    "Tayma": [47.95000, 29.30000],
    "Sabah Al Nasser": [47.95000, 29.30000],
    "Central Sabhan": [47.90000, 29.25000],
}

    response = []
    for raw_city, count in results:
        if not raw_city:
            continue
        city_key = raw_city.strip().lower()
        canonical_city = CITY_NAME_MAP.get(city_key)
        if not canonical_city:
            continue
        coords = city_coords.get(canonical_city)
        if coords:
            response.append({
                "city": canonical_city,
                "coordinates": coords,
                "orders": count
            })

    return response

# def get_orders_with_customer_city(db: Session) -> List[Dict]:
#     """
#     Fetch all orders along with the associated customer's address city.
    
#     Args:
#         db (Session): SQLAlchemy database session.
    
#     Returns:
#         List[Dict]: List of orders with city info.
#     """
#     results = (
#         db.query(
#             Order.id,
#             Order.status,
#             Order.total_amount,
#             Address.city
#         )
#         .join(Customer, Order.customer_id == Customer.id)
#         .join(Address, Address.customer_id == Customer.id)
#         .all()
#     )
    
#     return [
#         {
#             "order_id": order_id,
#             "status": status,
#             "total_amount": total_amount,
#             "city": city
#         }
#         for order_id, status, total_amount, city in results
#     ]

def get_unique_order_count_per_city(db: Session) -> List[Dict]:
    """
    Get the count of unique orders for each city.

    Args:
        db (Session): SQLAlchemy database session.

    Returns:
        List[Dict]: A list where each dict has 'city' and 'unique_order_count'.
    """
    results = (
        db.query(
            Address.city,
            func.count(distinct(Order.id)).label("unique_order_count")
        )
        .join(Customer, Order.customer_id == Customer.id)
        .join(Address, Address.customer_id == Customer.id)
        .group_by(Address.city)
        .order_by(func.count(distinct(Order.id)).desc())
        .all()
    )
    
    return [
        {"city": city, "unique_order_count": count}
        for city, count in results
    ]