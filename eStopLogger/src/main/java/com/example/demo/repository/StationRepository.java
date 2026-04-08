package com.example.demo.repository;

import com.example.demo.model.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StationRepository extends JpaRepository<Station, Long> {

    List<Station> findByFactory_FactoryId(String factoryId);

    @Query("SELECT s FROM Station s WHERE s.factory.factoryId = :factoryId AND s.blockId = :blockId")
    List<Station> findByFactoryIdAndBlockId(@Param("factoryId") String factoryId,
                                            @Param("blockId") String blockId);
}
