import json
import psycopg2
from psycopg2 import sql


# ============================================================
# CONFIGURATION
# ============================================================

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "enrolment",
    "user": "admin",
    "password": "123456",
}

JSON_FILE = "liste_fokontany_par_commune_data.json"


# ============================================================
# FONCTIONS
# ============================================================

def get_or_create_region(cursor, country_id, region_name):
    """
    Récupère une région existante ou la crée.
    """
    cursor.execute(
        """
        SELECT id
        FROM region
        WHERE country_id = %s
          AND name = %s
        LIMIT 1
        """,
        (country_id, region_name)
    )

    result = cursor.fetchone()

    if result:
        return result[0]

    cursor.execute(
        """
        INSERT INTO region (country_id, name)
        VALUES (%s, %s)
        RETURNING id
        """,
        (country_id, region_name)
    )

    return cursor.fetchone()[0]


def get_or_create_district(cursor, region_id, district_name):
    """
    Récupère un district existant ou le crée.
    """
    cursor.execute(
        """
        SELECT id
        FROM district
        WHERE region_id = %s
          AND name = %s
        LIMIT 1
        """,
        (region_id, district_name)
    )

    result = cursor.fetchone()

    if result:
        return result[0]

    cursor.execute(
        """
        INSERT INTO district (region_id, name)
        VALUES (%s, %s)
        RETURNING id
        """,
        (region_id, district_name)
    )

    return cursor.fetchone()[0]


def get_or_create_commune(cursor, district_id, commune_name):
    """
    Récupère une commune existante ou la crée.
    """
    cursor.execute(
        """
        SELECT id
        FROM commune
        WHERE district_id = %s
          AND name = %s
        LIMIT 1
        """,
        (district_id, commune_name)
    )

    result = cursor.fetchone()

    if result:
        return result[0]

    cursor.execute(
        """
        INSERT INTO commune (district_id, name)
        VALUES (%s, %s)
        RETURNING id
        """,
        (district_id, commune_name)
    )

    return cursor.fetchone()[0]


def get_or_create_fokontany(cursor, commune_id, fokontany_name):
    """
    Récupère un fokontany existant ou le crée.
    """
    cursor.execute(
        """
        SELECT id
        FROM fokontany
        WHERE commune_id = %s
          AND name = %s
        LIMIT 1
        """,
        (commune_id, fokontany_name)
    )

    result = cursor.fetchone()

    if result:
        return result[0]

    cursor.execute(
        """
        INSERT INTO fokontany (commune_id, name)
        VALUES (%s, %s)
        RETURNING id
        """,
        (commune_id, fokontany_name)
    )

    return cursor.fetchone()[0]


# ============================================================
# IMPORT
# ============================================================

def import_json():
    print("Lecture du fichier JSON...")

    with open(JSON_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    print("Connexion à PostgreSQL...")

    connection = psycopg2.connect(**DB_CONFIG)

    try:
        with connection.cursor() as cursor:

            # ------------------------------------------------
            # COUNTRY
            # ------------------------------------------------
            #
            # Ici on suppose que Madagascar existe déjà.
            #
            # Si tu as déjà son UUID, tu peux directement
            # mettre cet UUID dans MADAGASCAR_ID.
            #

            cursor.execute(
                """
                SELECT id
                FROM country
                WHERE iso2_code = 'MG'
                LIMIT 1
                """
            )

            result = cursor.fetchone()

            if result:
                madagascar_id = result[0]
            else:
                cursor.execute(
                    """
                    INSERT INTO country (
                        iso2_code,
                        iso3_code,
                        name,
                        nationality_name
                    )
                    VALUES ('MG', 'MDG', 'Madagascar', 'Malgache')
                    RETURNING id
                    """
                )

                madagascar_id = cursor.fetchone()[0]

                print("Pays Madagascar créé.")

            # ------------------------------------------------
            # PARCOURS DU JSON
            # ------------------------------------------------

            for region_key, region_data in data.items():

                # Ignore les éventuelles entrées qui ne sont
                # pas des régions.
                if not isinstance(region_data, dict):
                    continue

                if region_key == "Region":
                    continue
                
                # Le nom de la région est normalement la clé
                # du JSON : "ANALAMANGA", etc.
                region_name = region_key

                print(f"\nRégion : {region_name}")

                region_id = get_or_create_region(
                    cursor,
                    madagascar_id,
                    region_name
                )

                # ------------------------------------------------
                # COMMUNES
                # ------------------------------------------------

                for commune_key, fokontany_list in region_data.items():

                    if not isinstance(fokontany_list, list):
                        continue

                    # Chaque élément contient :
                    #
                    # {
                    #   "commune": "Ambato",
                    #   "region": "ANALAMANGA",
                    #   "fokontany": "Ambanimaso",
                    #   "district": "Ambohidratrimo"
                    # }

                    for item in fokontany_list:

                        commune_name = item.get("commune")
                        district_name = item.get("district")
                        fokontany_name = item.get("fokontany")

                        if not commune_name:
                            continue

                        if not district_name:
                            continue

                        if not fokontany_name:
                            continue

                        # ------------------------------------------------
                        # DISTRICT
                        # ------------------------------------------------

                        district_id = get_or_create_district(
                            cursor,
                            region_id,
                            district_name
                        )

                        # ------------------------------------------------
                        # COMMUNE
                        # ------------------------------------------------

                        commune_id = get_or_create_commune(
                            cursor,
                            district_id,
                            commune_name
                        )

                        # ------------------------------------------------
                        # FOKONTANY
                        # ------------------------------------------------

                        fokontany_id = get_or_create_fokontany(
                            cursor,
                            commune_id,
                            fokontany_name
                        )

                        print(
                            f"  ✓ {region_name} / "
                            f"{district_name} / "
                            f"{commune_name} / "
                            f"{fokontany_name}"
                        )

        # ----------------------------------------------------
        # COMMIT
        # ----------------------------------------------------

        connection.commit()

        print("\n===================================")
        print("Import terminé avec succès !")
        print("===================================")

    except Exception as error:
        connection.rollback()

        print("\nERREUR pendant l'import :")
        print(error)

        raise

    finally:
        connection.close()


# ============================================================
# PROGRAMME PRINCIPAL
# ============================================================

if __name__ == "__main__":
    import_json()