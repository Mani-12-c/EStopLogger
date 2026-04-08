package com.example.demo.repository;

import com.example.demo.model.entity.DispatchLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DispatchLogRepository extends JpaRepository<DispatchLog, Long> {

    List<DispatchLog> findByEvent_EventId(Long eventId);

    List<DispatchLog> findByEvent_Station_StationId(Long stationId);
}
